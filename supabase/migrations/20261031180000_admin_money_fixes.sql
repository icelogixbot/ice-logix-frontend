-- Починки раздела «Деньги» по замечаниям ревью (после 20261031170000_admin_money.sql).
--  1. Заработок дропшиппера и отчёт считают только оплаченные заказы (раньше — любые, кроме pending и cancelled).
--  2. Админ по таблицам payout_requests / payments / balance_entries только читает (запись — через функции с проверками
--     и журналом); admin_get_payout_card(bigint) недоступна из браузера — номер карты только через admin_payout_card.
--  3. Статус заявки на выплату не может быть пустым; сравнения статусов устойчивы к NULL.
--  4. Подтверждение платежа: этап уже закрыт суммой, платёж без заказа; сверка: пометка «переплата».
-- Откат: supabase/rollback/20261031180000_admin_money_fixes_rollback.sql

-- ── 1. Заработок дропшиппера: только оплаченные и не отменённые заказы ──
create or replace function public.admin_payout_stats(p_user bigint, p_exclude uuid default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'earned', e.earned, 'orders', e.cnt, 'paid_out', o.paid_out,
    'available', round(e.earned - o.paid_out, 2))
  from (select round(coalesce(sum(coalesce(ord.drop_margin, 0)), 0), 2) as earned,
               count(*) filter (where coalesce(ord.drop_margin, 0) > 0) as cnt
          from public.orders ord
         where ord.user_id in (select r.referred_id from public.referrals r where r.referrer_id = p_user)
           and ord.status <> 'cancelled'
           and (coalesce(ord.first_payment_paid, false)
                or ord.status not in ('pending', 'price_calculated', 'waiting_payment', 'awaiting_first_payment'))) e,
       (select round(coalesce(sum(pr.amount), 0), 2) as paid_out from public.payout_requests pr
         where pr.user_id = p_user and pr.status in ('approved', 'completed') and pr.id is distinct from p_exclude) o
$$;

-- ── 2. Права: админ только читает таблицы денег ──
drop policy if exists payout_requests_admin on public.payout_requests;
create policy payout_requests_admin_read on public.payout_requests for select to authenticated
  using ((select public.app_is_admin()));
drop policy if exists payments_admin on public.payments;
create policy payments_admin_read on public.payments for select to authenticated
  using ((select public.app_is_admin()));
drop policy if exists balance_entries_admin on public.balance_entries;
create policy balance_entries_admin_read on public.balance_entries for select to authenticated
  using ((select public.app_is_admin()));

-- полный номер карты — только через admin_payout_card (одобренная заявка + запись в журнал)
revoke all on function public.admin_get_payout_card(bigint) from public, anon, authenticated;

-- ── 3. Статус заявки на выплату всегда заполнен ──
update public.payout_requests set status = 'pending' where status is null;
alter table public.payout_requests alter column status set default 'pending';
alter table public.payout_requests alter column status set not null;

drop policy if exists payout_requests_own_insert on public.payout_requests;
create policy payout_requests_own_insert on public.payout_requests for insert to authenticated
  with check (user_id = (select public.app_uid()) and status = 'pending');

-- ── 4. Подтверждение платежа ──
create or replace function public.admin_confirm_payment(p_payment_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  p public.payments;
  o public.orders;
  v jsonb;
begin
  select * into p from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Заявка не найдена';
  end if;
  if p.status = 'PAID' then
    return jsonb_build_object('ok', true, 'already', true, 'status', 'PAID');
  end if;
  if p.status not in ('PENDING', 'REQUIRES_REVIEW') then
    raise exception 'Заявка уже обработана: %', case p.status when 'DECLINED' then 'отклонена' when 'CANCELLED' then 'отменена'
                                                  when 'EXPIRED' then 'истекла' when 'FAILED' then 'ошибка оплаты' else lower(p.status) end;
  end if;
  if coalesce(p.provider, 'manual') <> 'manual' and p.status <> 'REQUIRES_REVIEW' then
    raise exception 'Этот платёж подтверждает платёжная система, а не сотрудник';
  end if;
  if p.type in ('FIRST_PAYMENT', 'SECOND_PAYMENT') and p.order_id is null then
    raise exception 'У платежа нет заказа: деньги некуда зачесть. Отклоните заявку и разберитесь вручную';
  end if;
  if p.order_id is not null then
    select * into o from public.orders where id = p.order_id for update;
    if found and o.status = 'cancelled' then
      raise exception 'Заказ отменён. Отклоните заявку, а пришедшие деньги верните клиенту на баланс';
    end if;
    -- этап закрыт флагом или уже покрыт суммой — лишние деньги зависли бы в заказе
    if found and ((p.type = 'FIRST_PAYMENT' and (coalesce(o.first_payment_paid, false) or public.order_stage_due(o, 'FIRST') <= 0))
               or (p.type = 'SECOND_PAYMENT' and (coalesce(o.second_payment_paid, false) or public.order_stage_due(o, 'SECOND') <= 0))) then
      raise exception 'Этот этап заказа уже оплачен. Отклоните заявку, а пришедшие деньги верните клиенту на баланс';
    end if;
  end if;
  v := public.payment_settle(p.id, null, v_me);
  perform public.admin_log('payment_confirm', 'payment', p.id::text,
    jsonb_build_object('amount', p.amount, 'type', p.type, 'method', p.method, 'user_id', p.user_id, 'order_id', p.order_id));
  return v;
end $$;

-- ── 5. Выплаты: статус сравнивается устойчиво к NULL ──
create or replace function public.admin_payout_decision(p_request uuid, p_action text, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  r public.payout_requests;
  v_stats jsonb;
  v_avail numeric;
begin
  if p_action not in ('approve', 'reject', 'paid') then
    raise exception 'Неизвестное действие';
  end if;
  select * into r from public.payout_requests where id = p_request for update;
  if not found then
    raise exception 'Заявка не найдена';
  end if;

  if p_action = 'approve' then
    if r.status = 'approved' then
      return jsonb_build_object('status', 'approved', 'already', true);
    end if;
    if r.status is distinct from 'pending' then
      raise exception 'Заявка уже обработана';
    end if;
    if coalesce(r.amount, 0) <= 0 then
      raise exception 'В заявке нет суммы';
    end if;
    -- одна заявка клиента за раз: иначе два сотрудника одобрили бы больше заработанного
    perform 1 from public.users where user_id = r.user_id for update;
    v_stats := public.admin_payout_stats(r.user_id, r.id);
    v_avail := (v_stats ->> 'available')::numeric;
    if r.amount > v_avail + 0.005 then
      raise exception 'Нельзя одобрить: доступно к выплате %', greatest(v_avail, 0);
    end if;
    update public.payout_requests set status = 'approved', processed_at = now() where id = r.id;
    perform public.admin_log('payout_approve', 'payout', r.id::text,
      jsonb_build_object('user_id', r.user_id, 'amount', r.amount, 'stats', v_stats));
    return jsonb_build_object('status', 'approved');

  elsif p_action = 'paid' then
    if r.status = 'completed' then
      return jsonb_build_object('status', 'completed', 'already', true);
    end if;
    if r.status is distinct from 'approved' then
      raise exception 'Сначала одобрите заявку';
    end if;
    update public.payout_requests set status = 'completed', processed_at = now() where id = r.id;
    perform public.admin_log('payout_paid', 'payout', r.id::text, jsonb_build_object('user_id', r.user_id, 'amount', r.amount));
    return jsonb_build_object('status', 'completed');

  else
    if r.status = 'rejected' then
      return jsonb_build_object('status', 'rejected', 'already', true);
    end if;
    if r.status is distinct from 'pending' and r.status is distinct from 'approved' then
      raise exception 'Деньги по заявке уже переведены, отклонить её нельзя';
    end if;
    if coalesce(trim(p_reason), '') = '' then
      raise exception 'Укажите причину';
    end if;
    update public.payout_requests set status = 'rejected', processed_at = now() where id = r.id;
    perform public.admin_log('payout_reject', 'payout', r.id::text,
      jsonb_build_object('user_id', r.user_id, 'amount', r.amount, 'from', r.status, 'reason', left(trim(p_reason), 300)));
    return jsonb_build_object('status', 'rejected');
  end if;
end $$;

create or replace function public.admin_payout_card(p_request uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  r public.payout_requests;
  v_card text;
begin
  select * into r from public.payout_requests where id = p_request;
  if not found then
    raise exception 'Заявка не найдена';
  end if;
  if r.status is distinct from 'approved' then
    raise exception 'Карту можно посмотреть только по одобренной заявке';
  end if;
  v_card := public.admin_get_payout_card(r.user_id);
  perform public.admin_log('payout_card_view', 'payout', r.id::text, jsonb_build_object('user_id', r.user_id, 'found', v_card is not null));
  return jsonb_build_object('card', v_card);
end $$;

-- ── 6. Сверка: добавлена пометка «переплата» (клиент заплатил больше суммы заказа) ──
create or replace function public.admin_recon_rows()
returns table (order_id uuid, user_id bigint, status text, total numeric, total_paid numeric, total_refunded numeric,
               paid_payments numeric, paid_balance numeric, refunds_done numeric, refunds_balance numeric,
               balance_refund_credits numeric, issues text[], sig text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  with o as (
    select o.id, o.user_id, o.status, round(coalesce(o.total_byn, o.total_final, o.price_byn, 0), 2) as total,
           round(coalesce(o.total_paid, 0), 2) as tp, round(coalesce(o.total_refunded, 0), 2) as tr, o.created_at::timestamptz as created_at
      from public.orders o
     where o.archived_at is null
  ), s as (
    select o.*,
      (select coalesce(sum(p.amount), 0) from public.payments p
        where p.order_id = o.id and p.status = 'PAID' and p.type in ('FIRST_PAYMENT', 'SECOND_PAYMENT')) as pp,
      (select coalesce(sum(b.amount), 0) from public.balance_entries b
        where b.order_id = o.id and b.direction = 'DEBIT' and b.type = 'ORDER_PAYMENT') as pb,
      (select coalesce(sum(r.amount), 0) from public.refunds r where r.order_id = o.id and r.status = 'COMPLETED') as rd,
      (select coalesce(sum(r.amount), 0) from public.refunds r
        where r.order_id = o.id and r.status = 'COMPLETED' and r.destination = 'BALANCE') as rb,
      (select coalesce(sum(b.amount), 0) from public.balance_entries b
        where b.order_id = o.id and b.direction = 'CREDIT' and b.type = 'REFUND') as bc
      from o
  ), f as (
    select s.*,
      array_remove(array[
        case when abs(s.tp - (s.pp + s.pb)) > 0.009 then 'paid_mismatch' end,
        case when abs(s.tr - s.rd) > 0.009 then 'refund_mismatch' end,
        case when abs(s.rb - s.bc) > 0.009 then 'refund_balance_mismatch' end,
        case when s.status = 'cancelled' and s.tp - s.tr > 0.009 then 'cancelled_held' end,
        case when s.status <> 'cancelled' and s.total > 0 and s.tp - s.tr > s.total + 0.009 then 'overpaid' end
      ], null) as iss,
      concat_ws('|', s.status, s.tp, s.tr, s.pp + s.pb, s.rd, s.rb, s.bc) as sg
      from s
  )
  select f.id, f.user_id, f.status, f.total, f.tp, f.tr, f.pp, f.pb, f.rd, f.rb, f.bc, f.iss, f.sg, f.created_at
    from f
   where cardinality(f.iss) > 0
     and f.sg is distinct from (
       select e.new_value ->> 'sig' from public.order_events e
        where e.order_id = f.id and e.event_type = 'PROBLEM_ORDER_RESOLVED'
        order by e.created_at desc limit 1)
$$;

-- ── 7. Отчёт за период: оборот и «не оплачено» — по тому же правилу «оплачен», что и заработок дропшиппера ──
create or replace function public.admin_money_report(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_from timestamptz;
  v_to timestamptz;
  v jsonb;
begin
  perform public.admin_require('admin');
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Проверьте период';
  end if;
  if p_to - p_from > 3700 then
    raise exception 'Период слишком длинный';
  end if;
  v_from := p_from::timestamp at time zone 'Europe/Minsk';
  v_to := (p_to + 1)::timestamp at time zone 'Europe/Minsk';

  with ord as (
    select o.*, (coalesce(o.first_payment_paid, false)
                 or o.status not in ('pending', 'price_calculated', 'waiting_payment', 'awaiting_first_payment')) as is_paid
      from public.orders o where o.created_at >= v_from and o.created_at < v_to
  ), live as (
    select * from ord where status <> 'cancelled' and is_paid
  ), pay as (
    select * from public.payments where status = 'PAID' and coalesce(paid_at, created_at) >= v_from and coalesce(paid_at, created_at) < v_to
  ), led as (
    select * from public.balance_entries where created_at >= v_from and created_at < v_to
  ), ref as (
    select * from public.refunds where status = 'COMPLETED' and coalesce(completed_at, created_at) >= v_from and coalesce(completed_at, created_at) < v_to
  ), exp as (
    select * from public.expenses where created_at >= v_from and created_at < v_to
  )
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'orders', jsonb_build_object(
      'count',      (select count(*) from live),
      'turnover',   (select coalesce(sum(coalesce(total_byn, total_final, price_byn, 0)), 0) from live),
      'commission', (select coalesce(sum(coalesce(commission_byn, 0)), 0) from live),
      'duties',     (select coalesce(sum(coalesce(customs_duty_byn, customs_duty, 0)), 0) from live),
      'insurance',  (select coalesce(sum(coalesce(insurance_byn, 0)), 0) from live),
      'cancelled',  (select count(*) from ord where status = 'cancelled'),
      'unpaid',     (select count(*) from ord where status <> 'cancelled' and not is_paid)),
    'money_in', jsonb_build_object(
      'total',   (select coalesce(sum(amount), 0) from pay),
      'count',   (select count(*) from pay),
      'topup',   (select coalesce(sum(amount), 0) from pay where type = 'TOPUP'),
      'topup_count', (select count(*) from pay where type = 'TOPUP'),
      'orders',  (select coalesce(sum(amount), 0) from pay where type in ('FIRST_PAYMENT', 'SECOND_PAYMENT')),
      'methods', (select coalesce(jsonb_object_agg(method, s), '{}'::jsonb) from (select method, sum(amount) s from pay group by method) m)),
    'balance', jsonb_build_object(
      'used_for_orders', (select coalesce(sum(amount), 0) from led where direction = 'DEBIT' and type = 'ORDER_PAYMENT'),
      'bonuses',         (select coalesce(sum(amount), 0) from led where direction = 'CREDIT' and type in ('BONUS', 'REFERRAL_COMMISSION', 'REFERRAL_CASHBACK')),
      'purchases',       (select coalesce(sum(amount), 0) from led where direction = 'DEBIT' and type = 'PURCHASE'),
      'adjust_plus',     (select coalesce(sum(amount), 0) from led where direction = 'CREDIT' and type = 'ADJUSTMENT'),
      'adjust_minus',    (select coalesce(sum(amount), 0) from led where direction = 'DEBIT' and type = 'ADJUSTMENT')),
    'refunds', jsonb_build_object(
      'total', (select coalesce(sum(amount), 0) from ref),
      'count', (select count(*) from ref)),
    'payouts', (select coalesce(sum(amount), 0) from public.payout_requests
                 where status = 'completed' and processed_at >= v_from and processed_at < v_to),
    'expenses', jsonb_build_object(
      'total', (select coalesce(sum(amount), 0) from exp),
      'count', (select count(*) from exp),
      'by_category', (select coalesce(jsonb_agg(jsonb_build_object('category', category, 'sum', s, 'count', c) order by s desc), '[]'::jsonb)
                        from (select coalesce(nullif(trim(category), ''), 'Без статьи') as category, sum(amount) s, count(*) c from exp group by 1) x)),
    -- строки для таблицы: без имён и контактов клиентов
    'rows', (select coalesce(jsonb_agg(jsonb_build_object(
               'id', id, 'created_at', created_at, 'status', status,
               'total', coalesce(total_byn, total_final, price_byn, 0), 'commission', coalesce(commission_byn, 0),
               'duty', coalesce(customs_duty_byn, customs_duty, 0), 'paid', coalesce(total_paid, 0), 'refunded', coalesce(total_refunded, 0))
               order by created_at), '[]'::jsonb)
               from (select * from ord order by created_at limit 3000) x)
  ) into v;
  return v;
end $$;
