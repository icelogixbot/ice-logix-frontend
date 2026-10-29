-- Основа денег (этап А защиты, этап Б платежей).
-- 1) помощники прав для RLS; 2) баланс с копейками; 3) финансовая схема из ice-logix-go/migrations/002
--    (заказ в два платежа, платежи, привязанные карты, журнал баланса, возвраты, события заказа) — но с
--    настоящими правилами доступа вместо «всё всем»; 4) журнал баланса: любое изменение ices_balance
--    попадает в balance_entries, а запись в balance_entries меняет баланс.
-- Только добавляет; существующие данные не трогает (кроме типа ices_balance: integer -> numeric).

-- ---------------------------------------------------------------------------
-- 1. Помощники прав
-- ---------------------------------------------------------------------------
create or replace function public.app_uid() returns bigint
language sql stable security definer set search_path = public as $$
  select u.user_id from public.users u where u.auth_id = auth.uid() order by u.user_id limit 1
$$;

create or replace function public.app_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.auth_id = auth.uid() and u.role in ('owner', 'admin'))
$$;

create or replace function public.app_is_support() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.auth_id = auth.uid() and u.role in ('owner', 'admin', 'support'))
$$;

-- Сервер (секретный ключ, функции базы с SECURITY DEFINER) или админ.
-- Сама без SECURITY DEFINER: ей нужен настоящий current_user вызывающего.
create or replace function public.app_is_privileged() returns boolean
language sql stable set search_path = public as $$
  select current_user not in ('authenticated', 'anon') or public.app_is_admin()
$$;

grant execute on function public.app_uid(), public.app_is_admin(), public.app_is_support(), public.app_is_privileged()
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Баланс с копейками (бот начисляет 7% / 3% с копейками — в integer это падало)
-- ---------------------------------------------------------------------------
alter table public.users alter column ices_balance type numeric(12, 2) using ices_balance::numeric(12, 2);
alter table public.users alter column ices_balance set default 0;
alter table public.users drop constraint if exists users_balance_nonneg;
alter table public.users add constraint users_balance_nonneg check (ices_balance >= 0) not valid;

-- ---------------------------------------------------------------------------
-- 3. Заказ в два платежа: поля, которые ждёт оформление заказа в Mini App
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists completed_at timestamptz,
  add column if not exists currency varchar(8) not null default 'BYN',
  add column if not exists calculated_exchange_rate numeric(10, 4) not null default 0,
  add column if not exists estimated_delivery_amount numeric(12, 2) not null default 0,
  add column if not exists delivery_reserve_rate numeric(5, 4) not null default 0.70,
  add column if not exists delivery_reserve_amount numeric(12, 2) not null default 0,
  add column if not exists first_payment_amount numeric(12, 2) not null default 0,
  add column if not exists second_payment_amount numeric(12, 2) not null default 0,
  add column if not exists total_paid numeric(12, 2) not null default 0,
  add column if not exists total_refunded numeric(12, 2) not null default 0,
  add column if not exists balance_used numeric(12, 2) not null default 0,
  add column if not exists amount_due numeric(12, 2) not null default 0,
  add column if not exists selected_receiving_method text not null default 'SELF_PICKUP',
  add column if not exists flags jsonb not null default '[]'::jsonb,
  add column if not exists first_payment_snapshot jsonb,
  add column if not exists second_payment_snapshot jsonb,
  add column if not exists calculation_version text not null default 'v1.0',
  add column if not exists first_payment_paid boolean not null default false,
  add column if not exists second_payment_paid boolean not null default false,
  add column if not exists insurance_enabled boolean not null default false,
  add column if not exists legit_check_requested boolean not null default false,
  add column if not exists price_cny numeric(12, 2);

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_flags on public.orders using gin (flags);

alter table public.order_items
  add column if not exists product_url text not null default '',
  add column if not exists platform varchar(32) not null default 'PINDUODUO',
  add column if not exists pinduoduo_product_id text default '',
  add column if not exists variant text default '',
  add column if not exists source_price_cny numeric(12, 2) not null default 0,
  add column if not exists calculated_price_byn numeric(12, 2) not null default 0,
  add column if not exists actual_purchase_price_cny numeric(12, 2),
  add column if not exists actual_purchase_cost_byn numeric(12, 2),
  add column if not exists item_status text not null default 'PENDING',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- ---------------------------------------------------------------------------
-- 4. Привязанные карты (только токены платёжной системы, номер карты не хранится)
-- ---------------------------------------------------------------------------
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.users(user_id) on delete cascade,
  provider text not null default 'bepaid',
  provider_token_id text not null,
  card_brand varchar(32) not null default 'card',
  last4 varchar(4) not null,
  expiry_metadata text default '',
  is_default boolean not null default false,
  recurring_ready boolean not null default false,          -- карта сохранена как card_on_file
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DELETED', 'EXPIRED')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  deleted_at timestamptz,
  unique (user_id, provider, provider_token_id)
);
create index if not exists idx_payment_methods_user on public.payment_methods(user_id, status);

-- ---------------------------------------------------------------------------
-- 5. Платежи: пополнение баланса и оплата заказа (первый / второй платёж)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete restrict,   -- null для пополнения
  user_id bigint not null references public.users(user_id) on delete restrict,
  type text not null check (type in ('TOPUP', 'FIRST_PAYMENT', 'SECOND_PAYMENT', 'PRICE_ADJUSTMENT', 'OTHER')),
  method text not null default 'manual' check (method in ('manual', 'card', 'card_token', 'erip', 'oplati')),
  amount numeric(12, 2) not null check (amount > 0),
  currency varchar(8) not null default 'BYN',
  status text not null default 'CREATED'
    check (status in ('CREATED', 'PENDING', 'PAID', 'DECLINED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REQUIRES_REVIEW', 'REFUNDED', 'PARTIALLY_REFUNDED')),
  provider text not null default 'manual',
  provider_transaction_id text,
  payment_intent_id text not null unique default gen_random_uuid()::text,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by bigint,
  confirmed_by bigint,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  expires_at timestamptz
);
create index if not exists idx_payments_user on public.payments(user_id, created_at desc);
create index if not exists idx_payments_order on public.payments(order_id);
create index if not exists idx_payments_status on public.payments(status);
create unique index if not exists uq_payments_provider_tx on public.payments(provider, provider_transaction_id)
  where provider_transaction_id is not null;

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  attempt_number int not null default 1,
  provider_transaction_id text,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  status text not null default 'PENDING',
  error_code text,
  error_message_safe text,
  raw jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_payment_attempts_payment on public.payment_attempts(payment_id);

-- ---------------------------------------------------------------------------
-- 6. Журнал баланса
-- ---------------------------------------------------------------------------
create table if not exists public.balance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.users(user_id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  type text not null default 'ADJUSTMENT',
  amount numeric(12, 2) not null check (amount > 0),
  currency varchar(8) not null default 'BYN',
  direction text not null check (direction in ('CREDIT', 'DEBIT')),
  reason text not null,
  source_transaction_id text,
  balance_after numeric(12, 2),
  created_by bigint,
  created_at timestamptz not null default now()
);
create index if not exists idx_balance_entries_user on public.balance_entries(user_id, created_at desc);
create index if not exists idx_balance_entries_order on public.balance_entries(order_id);
create unique index if not exists uq_balance_entries_source on public.balance_entries(source_transaction_id)
  where source_transaction_id is not null and source_transaction_id not like 'direct:%';

-- Запись в журнал меняет баланс (если только сама не порождена прямой правкой баланса)
create or replace function public.ledger_apply() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_new numeric(12, 2);
begin
  if current_setting('app.ledger_skip_apply', true) = '1' then
    return new;
  end if;
  perform set_config('app.ledger_from_entry', '1', true);
  update public.users
     set ices_balance = coalesce(ices_balance, 0) + case when new.direction = 'CREDIT' then new.amount else -new.amount end
   where user_id = new.user_id
  returning ices_balance into v_new;
  perform set_config('app.ledger_from_entry', '', true);
  if v_new is null then
    raise exception 'Пользователь % не найден', new.user_id;
  end if;
  if v_new < 0 then
    raise exception 'Недостаточно средств на балансе' using errcode = 'P0001';
  end if;
  new.balance_after := v_new;
  return new;
end $$;

drop trigger if exists balance_entries_apply on public.balance_entries;
create trigger balance_entries_apply before insert on public.balance_entries
  for each row execute function public.ledger_apply();

-- Прямая правка баланса (админ-панель, бот) тоже попадает в журнал
create or replace function public.ledger_log_direct() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_delta numeric(12, 2);
  v_who text := current_user;
begin
  if current_setting('app.ledger_from_entry', true) = '1' then
    return new;
  end if;
  v_delta := coalesce(new.ices_balance, 0) - coalesce(old.ices_balance, 0);
  if v_delta = 0 then
    return new;
  end if;
  perform set_config('app.ledger_skip_apply', '1', true);
  insert into public.balance_entries (user_id, type, amount, direction, reason, created_by, balance_after, source_transaction_id)
  values (new.user_id, 'ADJUSTMENT', abs(v_delta), case when v_delta > 0 then 'CREDIT' else 'DEBIT' end,
          'DIRECT_EDIT', public.app_uid(), new.ices_balance, 'direct:' || v_who || ':' || gen_random_uuid());
  perform set_config('app.ledger_skip_apply', '', true);
  return new;
end $$;

drop trigger if exists users_ledger_log on public.users;
create trigger users_ledger_log after update of ices_balance on public.users
  for each row execute function public.ledger_log_direct();

-- ---------------------------------------------------------------------------
-- 7. Возвраты, события заказа, настройки финансов
-- ---------------------------------------------------------------------------
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete restrict,
  user_id bigint references public.users(user_id) on delete restrict,
  source_payment_id uuid references public.payments(id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  currency varchar(8) not null default 'BYN',
  destination text not null default 'BALANCE' check (destination in ('BALANCE', 'CARD')),
  provider_ref text,
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED')),
  reason text not null,
  created_by bigint,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_refunds_order on public.refunds(order_id);
create index if not exists idx_refunds_user on public.refunds(user_id);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  actor_type text not null default 'SYSTEM',
  actor_id bigint,
  old_value jsonb,
  new_value jsonb,
  reason text,
  related_entity_type text,
  related_entity_id text,
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_events_order on public.order_events(order_id, created_at);

create table if not exists public.financial_configs (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);
insert into public.financial_configs (key, value, description) values
  ('delivery_reserve_rate', '0.70'::jsonb, 'Доля предварительного резерва доставки (70%)'),
  ('insurance_rate', '0.02'::jsonb, 'Ставка страховки (2%)'),
  ('price_change_small_percent', '3.0'::jsonb, 'Порог небольшого изменения цены без остановки выкупа (3%)'),
  ('card_limit', '5'::jsonb, 'Сколько карт можно привязать'),
  ('exchange_rate_markup_percent', '4.0'::jsonb, 'Надбавка к курсу юаня'),
  ('packaging_default_byn', '18.00'::jsonb, 'Базовая стоимость упаковки'),
  ('duoduo_fee_rule', '{"type": "percent_with_min", "percent": 3.0, "min_cny": 2.0}'::jsonb, 'Сбор DuoDuo Pay'),
  ('free_storage_days', '14'::jsonb, 'Дней бесплатного хранения'),
  ('legit_check_price', '5.00'::jsonb, 'Цена ручной проверки Legit-Check'),
  ('topup_min', '1.00'::jsonb, 'Минимальное пополнение'),
  ('topup_max', '5000.00'::jsonb, 'Максимальное пополнение за раз')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 8. Операционные таблицы выкупа и доставки (админ-панель, operator-financials.js)
-- ---------------------------------------------------------------------------
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  item_id uuid references public.order_items(id) on delete set null,
  platform varchar(32) not null default 'PINDUODUO',
  pinduoduo_order_id text not null,
  product_id text,
  price_cny numeric(12, 2) not null,
  service_fee_cny numeric(12, 2) not null default 0,
  actual_paid_cny numeric(12, 2) not null,
  payment_method_description text not null default 'DuoDuo Pay / Corporate Card',
  purchase_datetime timestamptz not null default now(),
  operator_id bigint,
  proof_attachment text,
  status text not null default 'PURCHASED',
  created_at timestamptz not null default now()
);
create index if not exists idx_purchases_order on public.purchases(order_id);

create table if not exists public.shipping_estimates (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  estimated_weight numeric(8, 3) not null,
  estimated_volume numeric(8, 3),
  estimated_delivery_amount numeric(12, 2) not null,
  range_min numeric(12, 2),
  range_max numeric(12, 2),
  calculation_version text not null default 'v1.0',
  model_version_ai text not null default 'estimator-v1',
  created_at timestamptz not null default now()
);
create index if not exists idx_shipping_estimates_order on public.shipping_estimates(order_id);

create table if not exists public.shipping_actuals (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actual_weight numeric(8, 3) not null,
  actual_volume numeric(8, 3),
  actual_delivery_amount numeric(12, 2) not null,
  source text not null default 'BLUE_SQUIRREL',
  source_reference text,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_shipping_actuals_order on public.shipping_actuals(order_id);

create table if not exists public.packaging_estimates (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  items_materials jsonb not null default '[]'::jsonb,
  estimated_amount numeric(12, 2) not null,
  ai_model_version text not null default 'packaging-v1',
  tolerance numeric(12, 2) not null default 2.00,
  created_at timestamptz not null default now()
);
create index if not exists idx_packaging_estimates_order on public.packaging_estimates(order_id);

create table if not exists public.packaging_actuals (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  materials_items jsonb not null default '[]'::jsonb,
  actual_amount numeric(12, 2) not null,
  source_operator bigint,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_packaging_actuals_order on public.packaging_actuals(order_id);

create table if not exists public.adjustments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  type text not null,
  amount numeric(12, 2) not null,
  currency varchar(8) not null default 'BYN',
  direction text not null check (direction in ('CREDIT', 'DEBIT')),
  reason text not null,
  source text not null default 'SYSTEM',
  created_by bigint,
  related_event_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_adjustments_order on public.adjustments(order_id);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  shipment_number text not null unique,
  type text not null default 'MINSK_TO_NESVIZH',
  from_location text not null default 'Minsk Hub',
  to_location text not null default 'Nesvizh Hub',
  carrier text not null default 'INTERNAL',
  total_cost numeric(12, 2) not null default 0,
  total_weight numeric(10, 3) not null default 0,
  formula_type text not null default 'WEIGHT_PROPORTIONAL',
  formula_version text not null default 'v1.0',
  orders_count int not null default 0,
  distribution_records jsonb not null default '[]'::jsonb,
  status text not null default 'PREPARING',
  created_at timestamptz not null default now(),
  arrived_at timestamptz
);

-- ---------------------------------------------------------------------------
-- 9. Права на новые таблицы. Деньги и карты клиент только читает (свои); пишет сервер.
-- ---------------------------------------------------------------------------
alter table public.payment_methods enable row level security;
alter table public.payments enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.balance_entries enable row level security;
alter table public.refunds enable row level security;
alter table public.order_events enable row level security;
alter table public.financial_configs enable row level security;
alter table public.purchases enable row level security;
alter table public.shipping_estimates enable row level security;
alter table public.shipping_actuals enable row level security;
alter table public.packaging_estimates enable row level security;
alter table public.packaging_actuals enable row level security;
alter table public.adjustments enable row level security;
alter table public.shipments enable row level security;

create policy payment_methods_own_read on public.payment_methods for select to authenticated
  using (user_id = (select public.app_uid()) and status = 'ACTIVE');
create policy payment_methods_admin on public.payment_methods for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));

create policy payments_own_read on public.payments for select to authenticated
  using (user_id = (select public.app_uid()));
create policy payments_admin on public.payments for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));

create policy payment_attempts_admin on public.payment_attempts for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));

create policy balance_entries_own_read on public.balance_entries for select to authenticated
  using (user_id = (select public.app_uid()));
create policy balance_entries_admin on public.balance_entries for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));

create policy refunds_own_read on public.refunds for select to authenticated
  using (user_id = (select public.app_uid()));
create policy refunds_admin on public.refunds for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));

create policy order_events_own_read on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select public.app_uid())));
create policy order_events_admin on public.order_events for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));

create policy financial_configs_read on public.financial_configs for select to anon, authenticated using (true);
create policy financial_configs_admin on public.financial_configs for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));

create policy shipping_estimates_own on public.shipping_estimates for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select public.app_uid())));
create policy shipping_estimates_own_insert on public.shipping_estimates for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select public.app_uid())));
create policy shipping_estimates_admin on public.shipping_estimates for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));

create policy packaging_estimates_own on public.packaging_estimates for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select public.app_uid())));
create policy packaging_estimates_own_insert on public.packaging_estimates for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select public.app_uid())));
create policy packaging_estimates_admin on public.packaging_estimates for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));

create policy purchases_admin on public.purchases for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));
create policy shipping_actuals_admin on public.shipping_actuals for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));
create policy packaging_actuals_admin on public.packaging_actuals for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));
create policy adjustments_admin on public.adjustments for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));
create policy shipments_admin on public.shipments for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));
