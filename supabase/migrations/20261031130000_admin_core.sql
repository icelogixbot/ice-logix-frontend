-- Новая админка, этапы 0–1 (ADMIN_PLAN.md):
-- 1) статусы заказа, которые сервер уже использует, но база не принимала;
-- 2) роли выдаёт только владелец (раньше любой админ мог поменять роль прямо в таблице);
-- 3) отпуск байера и буфер курса — в общей таблице settings, а не в профиле одного из владельцев;
-- 4) серверные функции админки: сводка Пульта, роли, баланс, отзывы, претензии. Каждая пишет журнал admin_logs.
-- Откат: supabase/rollback/20261031130000_admin_core_rollback.sql

-- ── 1. Статусы заказа ──
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status = any (array[
  'pending', 'price_calculated', 'waiting_payment', 'paid', 'bought', 'on_sklad_cn', 'in_transit', 'in_belarus',
  'delivered', 'cancelled',
  'awaiting_decision',  -- товар подорожал сверх порога, ждём решения клиента (order_price_decision)
  'awaiting_payment',   -- ждём второй платёж (order_close_stage_if_paid)
  'paid_second'         -- второй платёж получен
]));

-- ── 2. Владелец и защита ролей ──
create or replace function public.app_is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.auth_id = auth.uid() and u.role = 'owner')
$$;
revoke all on function public.app_is_owner() from public, anon;
grant execute on function public.app_is_owner() to authenticated;

create or replace function public.users_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  o jsonb;
  n jsonb;
  c text;
  locked text[] := array['user_id', 'auth_id', 'telegram_id', 'ices_balance', 'role', 'referral_count', 'referral_bonus',
                         'referrer_id', 'is_trusted', 'is_banned', 'ban_reason', 'ban_expires_at', 'warnings_count', 'is_toxic',
                         'kyc_verified_at', 'total_spent', 'orders_count', 'client_level', 'vault_passport', 'encrypted_passport',
                         'encrypted_card', 'last_spin', 'created_at'];
begin
  -- роль меняет только владелец (через admin_set_role) или сервер; админ из браузера — нет
  if tg_op = 'UPDATE' and new.role is distinct from old.role
     and current_user in ('authenticated', 'anon') and not public.app_is_owner() then
    raise exception 'Роли выдаёт только владелец' using errcode = '42501';
  end if;

  if public.app_is_privileged() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'user';
    new.ices_balance := 0;
    new.referral_count := 0;
    new.referral_bonus := 0;
    new.is_trusted := false;
    new.is_banned := false;
    new.kyc_verified_at := null;
    new.vault_passport := null;
    new.encrypted_card := null;
    return new;
  end if;

  o := to_jsonb(old);
  n := to_jsonb(new);
  foreach c in array locked loop
    if (o -> c) is distinct from (n -> c) then
      raise exception 'Поле % меняется только сервером', c using errcode = '42501';
    end if;
  end loop;

  -- реферальный код можно задать один раз
  if old.referral_code is not null and new.referral_code is distinct from old.referral_code then
    raise exception 'Реферальный код уже задан' using errcode = '42501';
  end if;
  -- проверку паспорта клиент может только отправить «на проверку»
  if new.kyc_status is distinct from old.kyc_status and new.kyc_status <> 'pending' then
    raise exception 'Статус проверки меняет оператор' using errcode = '42501';
  end if;

  -- служебные ключи настроек: колесо удачи, семья — только сервер; бесплатные доставки можно только тратить
  if new.settings is distinct from old.settings then
    new.settings := coalesce(new.settings, '{}'::jsonb);
    new.settings := new.settings - 'last_fortune_spin' - 'family';
    if old.settings ? 'last_fortune_spin' then
      new.settings := jsonb_set(new.settings, '{last_fortune_spin}', old.settings -> 'last_fortune_spin');
    end if;
    if old.settings ? 'family' then
      new.settings := jsonb_set(new.settings, '{family}', old.settings -> 'family');
    end if;
    if coalesce((new.settings ->> 'free_delivery_tokens')::numeric, 0) > coalesce((old.settings ->> 'free_delivery_tokens')::numeric, 0) then
      new.settings := jsonb_set(new.settings, '{free_delivery_tokens}', coalesce(old.settings -> 'free_delivery_tokens', '0'::jsonb));
    end if;
  end if;
  return new;
end $$;

-- ── 3. Отпуск байера и буфер курса в settings ──
insert into public.settings (key, value, updated_at)
select 'buyer_vacation', coalesce(u.settings -> 'buyer_vacation', '{"active": false, "days": 0}'::jsonb), now()
from (select settings from public.users where role = 'owner' and settings ? 'buyer_vacation' order by user_id limit 1) u
on conflict (key) do nothing;
insert into public.settings (key, value, updated_at) values ('buyer_vacation', '{"active": false, "days": 0}'::jsonb, now())
on conflict (key) do nothing;

insert into public.settings (key, value, updated_at)
select 'exchange_buffer', u.settings -> 'exchange_buffer', now()
from (select settings from public.users where role = 'owner' and settings ? 'exchange_buffer' order by user_id limit 1) u
on conflict (key) do nothing;

create or replace function public.get_public_config() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'buyer_vacation', coalesce(
      (select value from public.settings where key = 'buyer_vacation'),
      (select settings -> 'buyer_vacation' from public.users where role = 'owner' and settings ? 'buyer_vacation' order by user_id limit 1),
      '{"active": false, "days": 0}'::jsonb),
    'exchange_buffer', coalesce(
      (select value from public.settings where key = 'exchange_buffer'),
      (select settings -> 'exchange_buffer' from public.users where role = 'owner' and settings ? 'exchange_buffer' order by user_id limit 1)))
$$;

-- ── 4. Журнал и проверки ──
create or replace function public.admin_log(p_action text, p_target_type text, p_target_id text, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_logs (admin_id, action, target_type, target_id, details)
  values (public.app_uid(), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb))
$$;
revoke all on function public.admin_log(text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.admin_require(p_level text default 'admin') returns bigint
language plpgsql stable security definer set search_path = public as $$
begin
  if p_level = 'owner' and not public.app_is_owner() then
    raise exception 'Только для владельца' using errcode = '42501';
  end if;
  if not public.app_is_admin() then
    raise exception 'Только для администратора' using errcode = '42501';
  end if;
  return public.app_uid();
end $$;
revoke all on function public.admin_require(text) from public, anon, authenticated;

-- ── 5. Сводка Пульта ──
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_today timestamptz := date_trunc('day', now() at time zone 'Europe/Minsk') at time zone 'Europe/Minsk';
  v jsonb;
begin
  perform public.admin_require('admin');

  with live as (select * from public.orders where archived_at is null),
  periods as (select * from (values ('today', v_today), ('d7', now() - interval '7 days'), ('d30', now() - interval '30 days')) t(k, since))
  select jsonb_build_object(
    'attention', jsonb_build_object(
      'payments_pending', (select count(*) from public.payments where status in ('PENDING', 'REQUIRES_REVIEW') and method = 'manual'),
      'orders_to_buy',    (select count(*) from live where status = 'paid'),
      'client_priced',    (select count(*) from live where status = 'paid' and coalesce(flags, '[]'::jsonb) ? 'client_priced'),
      'awaiting_decision',(select count(*) from live where status = 'awaiting_decision'),
      'awaiting_payment', (select count(*) from live where status = 'awaiting_payment'),
      'orders_unpaid',    (select count(*) from live where status = 'pending'),
      'stuck',            (select count(*) from live where status not in ('pending', 'delivered', 'cancelled')
                                                  and coalesce(updated_at, created_at) < now() - interval '7 days'),
      'claims',           (select count(*) from public.insurance_claims where coalesce(status, 'pending') = 'pending'),
      'disputes',         (select count(*) from public.arbitration_tickets where coalesce(status, 'open') not in ('resolved', 'closed', 'rejected')),
      'tickets',          (select count(*) from public.support_tickets where unread_by_operator and coalesce(status, '') <> 'closed'),
      'reviews',          (select count(*) from public.reviews where coalesce(moderation_status, case when is_published then 'approved' else 'pending' end) = 'pending'),
      'ugc',              (select count(*) from public.ugc_videos where coalesce(status, 'pending') = 'pending'),
      'bonus_orders',     (select count(*) from public.bonus_shop_orders where upper(coalesce(status, 'PENDING')) = 'PENDING'),
      'kyc',              (select count(*) from public.kyc_verifications where coalesce(status, 'pending') = 'pending'),
      'payouts',          (select count(*) from public.payout_requests where status = 'pending'),
      'legit',            (select count(*) from public.legit_check_requests where coalesce(status, 'pending') = 'pending'),
      'resale',           (select count(*) from public.resale_items where coalesce(status, 'pending') = 'pending')
    ),
    'stats', (select jsonb_object_agg(p.k, jsonb_build_object(
      'orders',     (select count(*) from public.orders o where o.created_at >= p.since and o.status <> 'cancelled'),
      'turnover',   (select coalesce(sum(coalesce(o.total_byn, o.total_final, o.price_byn, 0)), 0) from public.orders o
                      where o.created_at >= p.since and o.status not in ('cancelled', 'pending')),
      'commission', (select coalesce(sum(coalesce(o.commission_byn, 0)), 0) from public.orders o
                      where o.created_at >= p.since and o.status not in ('cancelled', 'pending')),
      'paid',       (select coalesce(sum(pm.amount), 0) from public.payments pm where pm.status = 'PAID' and coalesce(pm.paid_at, pm.created_at) >= p.since),
      'new_users',  (select count(*) from public.users u where u.created_at >= p.since)
    )) from periods p),
    'health', jsonb_build_object(
      'payments_paused', coalesce((select is_payments_paused from public.app_settings where id = 1), false),
      'pause_reason',    (select pause_reason from public.app_settings where id = 1),
      'pdd_online',      public.pdd_worker_online(),
      'pdd_last_seen',   (select max(last_seen) from public.pdd_workers),
      'notify_failed',   (select count(*) from public.notification_queue where status = 'failed' and created_at > now() - interval '7 days'),
      'notify_queued',   (select count(*) from public.notification_queue where status = 'queued'),
      'last_backup',     (select max(created_at) from public.admin_events where kind like 'backup%'),
      'vacation',        (select value from public.settings where key = 'buyer_vacation')
    ),
    'me', jsonb_build_object('user_id', public.app_uid(), 'role', (select role from public.users where auth_id = auth.uid() order by user_id limit 1)),
    'at', now()
  ) into v;
  return v;
end $$;

-- ── 6. Роли ──
create or replace function public.admin_set_role(p_user bigint, p_role text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('owner');
  v_old text;
begin
  if p_role not in ('user', 'support', 'admin', 'owner') then
    raise exception 'Неизвестная роль';
  end if;
  if p_user = v_me then
    raise exception 'Свою роль поменять нельзя: попросите другого владельца';
  end if;
  select role into v_old from public.users where user_id = p_user for update;
  if not found then
    raise exception 'Пользователь не найден. Он должен хотя бы раз открыть приложение';
  end if;
  if v_old is not distinct from p_role then
    return jsonb_build_object('user_id', p_user, 'role', p_role, 'changed', false);
  end if;
  update public.users set role = p_role, updated_at = now() where user_id = p_user;
  perform public.admin_log('set_role', 'user', p_user::text, jsonb_build_object('from', v_old, 'to', p_role));
  return jsonb_build_object('user_id', p_user, 'role', p_role, 'changed', true);
end $$;

-- ── 7. Баланс: только владелец, с причиной, через журнал ──
create or replace function public.admin_adjust_balance(p_user bigint, p_amount numeric, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('owner');
  v_amount numeric := round(coalesce(p_amount, 0), 2);
  v_after numeric;
begin
  if v_amount = 0 then
    raise exception 'Сумма не может быть нулевой';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Укажите причину';
  end if;
  perform 1 from public.users where user_id = p_user for update;
  if not found then
    raise exception 'Пользователь не найден';
  end if;
  v_after := public.wallet_move(p_user, abs(v_amount), case when v_amount > 0 then 'CREDIT' else 'DEBIT' end,
                                'ADMIN_ADJUSTMENT', 'ADJUSTMENT', null, null, 'admin:' || v_me || ':' || gen_random_uuid());
  perform public.admin_log('adjust_balance', 'user', p_user::text,
                           jsonb_build_object('amount', v_amount, 'reason', trim(p_reason), 'balance_after', v_after));
  return jsonb_build_object('balance', v_after);
end $$;

-- ── 8. Отзывы: бонус за фото один раз ──
create or replace function public.admin_review_decision(p_review uuid, p_approve boolean, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  r public.reviews;
  v_bonus numeric := 0;
begin
  select * into r from public.reviews where id = p_review for update;
  if not found then
    raise exception 'Отзыв не найден';
  end if;
  if p_approve then
    update public.reviews
       set is_published = true, moderation_status = 'approved', moderation_reason = null,
           moderated_by = v_me, moderated_at = now()
     where id = r.id;
    if not coalesce(r.bonus_given, false) and r.user_id is not null
       and jsonb_typeof(r.media_urls) = 'array' and jsonb_array_length(r.media_urls) > 0 then
      v_bonus := 5;
      perform public.wallet_move(r.user_id, v_bonus, 'CREDIT', 'REVIEW_BONUS', 'BONUS', r.order_id, null, 'review_bonus:' || r.id);
      update public.reviews set bonus_given = true where id = r.id;
    end if;
  else
    update public.reviews
       set is_published = false, moderation_status = 'rejected', moderation_reason = nullif(trim(coalesce(p_reason, '')), ''),
           moderated_by = v_me, moderated_at = now()
     where id = r.id;
  end if;
  perform public.admin_log(case when p_approve then 'review_approved' else 'review_rejected' end, 'review', r.id::text,
                           jsonb_build_object('bonus', v_bonus, 'reason', p_reason));
  return jsonb_build_object('ok', true, 'bonus', v_bonus);
end $$;

-- ── 9. Страховые претензии: сумма ущерба, а не весь заказ; повтор не выплачивает дважды ──
create or replace function public.admin_claim_decision(p_claim uuid, p_approve boolean, p_amount numeric default null, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  c public.insurance_claims;
  v_paid numeric;
  v_amount numeric := round(coalesce(p_amount, 0), 2);
begin
  select * into c from public.insurance_claims where id = p_claim for update;
  if not found then
    raise exception 'Претензия не найдена';
  end if;
  if coalesce(c.status, 'pending') <> 'pending' then
    raise exception 'Претензия уже рассмотрена';
  end if;
  if p_approve then
    select coalesce(total_paid, 0) - coalesce(total_refunded, 0) into v_paid from public.orders where id = c.order_id;
    if v_amount <= 0 then
      raise exception 'Укажите сумму возмещения';
    end if;
    if v_amount > coalesce(v_paid, 0) then
      raise exception 'Сумма больше, чем клиент заплатил за заказ (%)', coalesce(v_paid, 0);
    end if;
    perform public.wallet_move(c.user_id, v_amount, 'CREDIT', 'INSURANCE_REFUND', 'REFUND', c.order_id, null, 'claim:' || c.id);
    insert into public.refunds (order_id, user_id, amount, destination, status, reason, created_by, completed_at)
    values (c.order_id, c.user_id, v_amount, 'BALANCE', 'COMPLETED', 'Страховой случай', v_me, now());
    update public.orders set total_refunded = coalesce(total_refunded, 0) + v_amount, updated_at = now() where id = c.order_id;
    update public.insurance_claims set status = 'approved' where id = c.id;
    perform public.order_event(c.order_id, 'INSURANCE_REFUND', 'OPERATOR', jsonb_build_object('amount', v_amount, 'claim_id', c.id), null);
  else
    if coalesce(trim(p_reason), '') = '' then
      raise exception 'Укажите причину отказа';
    end if;
    update public.insurance_claims set status = 'rejected', rejection_reason = trim(p_reason) where id = c.id;
  end if;
  perform public.admin_log(case when p_approve then 'claim_approved' else 'claim_rejected' end, 'claim', c.id::text,
                           jsonb_build_object('amount', v_amount, 'reason', p_reason, 'order_id', c.order_id));
  return jsonb_build_object('ok', true, 'amount', case when p_approve then v_amount else 0 end);
end $$;

-- ── 10. Отпуск байера ──
create or replace function public.admin_set_vacation(p_active boolean, p_days integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v jsonb := jsonb_build_object('active', coalesce(p_active, false), 'days', greatest(least(coalesce(p_days, 0), 90), 0));
begin
  perform public.admin_require('admin');
  insert into public.settings (key, value, updated_at) values ('buyer_vacation', v, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  perform public.admin_log('set_vacation', 'settings', 'buyer_vacation', v);
  return v;
end $$;

revoke all on function public.admin_overview(), public.admin_set_role(bigint, text), public.admin_adjust_balance(bigint, numeric, text),
  public.admin_review_decision(uuid, boolean, text), public.admin_claim_decision(uuid, boolean, numeric, text),
  public.admin_set_vacation(boolean, integer) from public, anon;
grant execute on function public.admin_overview(), public.admin_set_role(bigint, text), public.admin_adjust_balance(bigint, numeric, text),
  public.admin_review_decision(uuid, boolean, text), public.admin_claim_decision(uuid, boolean, numeric, text),
  public.admin_set_vacation(boolean, integer) to authenticated;
