-- Этап Б: платёжный шлюз (bePaid: карта, привязанная карта, ЕРИП; «Оплати» — после договора).
-- Карту клиент вводит только на странице bePaid; у нас — токен, последние 4 цифры и бренд.
-- Включение: секреты BEPAID_SHOP_ID, BEPAID_SECRET_KEY, BEPAID_PUBLIC_KEY, BEPAID_MODE=test|live (функция payments).

-- Сессия привязки карты (tracking_id = 'bind:' || id)
create table if not exists public.card_bind_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.users(user_id) on delete cascade,
  provider text not null default 'bepaid',
  status text not null default 'PENDING' check (status in ('PENDING', 'DONE', 'FAILED', 'EXPIRED')),
  checkout_token text,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.card_bind_sessions enable row level security;
create policy card_bind_sessions_own_read on public.card_bind_sessions for select to authenticated
  using (user_id = (select public.app_uid()));
create policy card_bind_sessions_admin on public.card_bind_sessions for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));

-- Сохранить карту по ответу платёжки (только сервер). Первая карта становится основной; лимит из financial_configs.
create or replace function public.card_save_from_provider(
  p_user bigint, p_provider text, p_token text, p_last4 text, p_brand text, p_expiry text, p_recurring boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_count int;
begin
  if coalesce(p_token, '') = '' then
    return null;
  end if;
  select id into v_id from public.payment_methods where user_id = p_user and provider = p_provider and provider_token_id = p_token;
  if v_id is not null then
    update public.payment_methods
       set status = 'ACTIVE', deleted_at = null, last4 = coalesce(nullif(p_last4, ''), last4),
           card_brand = coalesce(nullif(p_brand, ''), card_brand), expiry_metadata = coalesce(p_expiry, expiry_metadata),
           recurring_ready = recurring_ready or coalesce(p_recurring, false)
     where id = v_id;
    return v_id;
  end if;
  select count(*) into v_count from public.payment_methods where user_id = p_user and status = 'ACTIVE';
  if v_count >= public.fin_config('card_limit', 5) then
    raise exception 'Можно привязать не больше % карт', public.fin_config('card_limit', 5);
  end if;
  insert into public.payment_methods (user_id, provider, provider_token_id, card_brand, last4, expiry_metadata, is_default, recurring_ready)
  values (p_user, p_provider, p_token, coalesce(nullif(p_brand, ''), 'card'), right(coalesce(p_last4, '0000'), 4), coalesce(p_expiry, ''),
          v_count = 0, coalesce(p_recurring, false))
  returning id into v_id;
  return v_id;
end $$;

-- Клиент: основная карта и удаление (только свои)
create or replace function public.card_set_default(p_card uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid bigint := public.app_require_uid();
begin
  if not exists (select 1 from public.payment_methods where id = p_card and user_id = v_uid and status = 'ACTIVE') then
    raise exception 'Карта не найдена';
  end if;
  update public.payment_methods set is_default = (id = p_card) where user_id = v_uid and status = 'ACTIVE';
end $$;

create or replace function public.card_delete(p_card uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  v_was_default boolean;
begin
  update public.payment_methods set status = 'DELETED', deleted_at = now(), is_default = false
   where id = p_card and user_id = v_uid and status = 'ACTIVE'
  returning true into v_was_default;
  -- если удалили основную — основной становится самая новая из оставшихся
  if not exists (select 1 from public.payment_methods where user_id = v_uid and status = 'ACTIVE' and is_default) then
    update public.payment_methods set is_default = true
     where id = (select id from public.payment_methods where user_id = v_uid and status = 'ACTIVE' order by created_at desc limit 1);
  end if;
end $$;

-- Отметить платёж неуспешным (ответ платёжки «отклонено/ошибка/истёк»). Оплаченный не трогаем.
create or replace function public.payment_fail(p_payment_id uuid, p_status text, p_reason text, p_provider_tx text default null)
returns void language sql security definer set search_path = public as $$
  update public.payments
     set status = case when p_status in ('DECLINED', 'FAILED', 'EXPIRED', 'CANCELLED') then p_status else 'FAILED' end,
         failure_reason = left(coalesce(p_reason, ''), 300),
         provider_transaction_id = coalesce(provider_transaction_id, p_provider_tx)
   where id = p_payment_id and status in ('CREATED', 'PENDING', 'REQUIRES_REVIEW')
$$;

revoke all on function public.card_save_from_provider(bigint, text, text, text, text, text, boolean),
                       public.payment_fail(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.card_save_from_provider(bigint, text, text, text, text, text, boolean),
                          public.payment_fail(uuid, text, text, text), public.payment_settle(uuid, text, bigint)
  to service_role;

revoke all on function public.card_set_default(uuid), public.card_delete(uuid) from public, anon;
grant execute on function public.card_set_default(uuid), public.card_delete(uuid) to authenticated;

-- Платежу нужен способ провайдера: разрешаем bepaid / sandbox в provider (текстовое поле, без ограничения) — ок.
-- ЕРИП: номер заказа в ЕРИП (число) храним в metadata.erip.order_id, ищем по нему уведомление.
create index if not exists idx_payments_erip_order on public.payments ((metadata #>> '{erip,order_id}'));
