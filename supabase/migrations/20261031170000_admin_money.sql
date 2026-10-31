-- Раздел админки «Деньги» (этап 2 ADMIN_HANDOFF.md, этап 3 ADMIN_PLAN.md).
-- Оплаты на проверке и история платежей, журнал баланса, возвраты, выплаты дропшипперам, сверка заказов,
-- расходы и отчёт за период. Всё читается и меняется только серверными функциями с проверкой роли
-- (admin_require), каждое действие пишется в admin_logs. Деньги клиента двигает только wallet_move
-- (здесь — через существующий payment_settle). Новых таблиц и колонок нет.
-- Откат: supabase/rollback/20261031170000_admin_money_rollback.sql

-- ── 1. Причина движения по балансу по-русски ──
-- Бот пишет причину сразу русским текстом, приложение — кодом (USED_FOR_ORDER и т.п.).
create or replace function public.admin_money_reason(p_reason text, p_type text) returns text
language sql immutable set search_path = public as $$
  select case
    when coalesce(p_reason, '') ~ '[А-Яа-яЁё]' then p_reason
    else coalesce(
      case upper(coalesce(p_reason, ''))
        when 'TOPUP' then 'Пополнение баланса'
        when 'USED_FOR_ORDER' then 'Оплата заказа с баланса'
        when 'FAMILY_ORDER_PAYMENT' then 'Оплата заказа из семейного бюджета'
        when 'REFUND_TO_BALANCE' then 'Возврат по заказу'
        when 'PRICE_DROP_REFUND' then 'Товар подешевел при выкупе'
        when 'DELIVERY_SURPLUS' then 'Излишек резерва за доставку'
        when 'INSURANCE_REFUND' then 'Выплата по страховке'
        when 'REVIEW_BONUS' then 'Бонус за отзыв'
        when 'FORTUNE_WHEEL' then 'Колесо фортуны'
        when 'BONUS_SHOP_PURCHASE' then 'Покупка в бонусном магазине'
        when 'COURSE_PURCHASE' then 'Покупка курса'
        when 'LEGIT_CHECK' then 'Проверка Legit-Check'
        when 'ADMIN_ADJUSTMENT' then 'Правка баланса сотрудником'
        when 'DIRECT_EDIT' then 'Правка баланса в обход журнала'
        when 'TEST_CLEANUP' then 'Чистка тестовых данных'
        else null end,
      case upper(coalesce(p_type, ''))
        when 'TOPUP' then 'Пополнение баланса'
        when 'ORDER_PAYMENT' then 'Оплата заказа'
        when 'REFUND' then 'Возврат'
        when 'BONUS' then 'Бонус'
        when 'PURCHASE' then 'Покупка'
        when 'ADJUSTMENT' then 'Правка баланса'
        when 'REFERRAL_COMMISSION' then 'Реферальный бонус'
        when 'REFERRAL_CASHBACK' then 'Кэшбэк по реферальной программе'
        else null end,
      'Движение по балансу')
  end
$$;

-- ── 2. Сверка: заказы, где записанные суммы не сходятся с платежами, журналом баланса и возвратами ──
-- Только заказы не в архиве. Заказ, который сотрудник уже проверил (событие PROBLEM_ORDER_RESOLVED
-- с тем же «отпечатком» сумм), не показывается, пока суммы снова не изменятся.
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
        case when s.status = 'cancelled' and s.tp - s.tr > 0.009 then 'cancelled_held' end
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

-- ── 3. Заработок дропшиппера: наценка с оплаченных и не отменённых заказов приглашённых им клиентов ──
-- p_exclude — заявка, которую сейчас решаем: её сумма в «уже выплачено» не считается.
create or replace function public.admin_payout_stats(p_user bigint, p_exclude uuid default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'earned', e.earned, 'orders', e.cnt, 'paid_out', o.paid_out,
    'available', round(e.earned - o.paid_out, 2))
  from (select round(coalesce(sum(coalesce(ord.drop_margin, 0)), 0), 2) as earned,
               count(*) filter (where coalesce(ord.drop_margin, 0) > 0) as cnt
          from public.orders ord
         where ord.user_id in (select r.referred_id from public.referrals r where r.referrer_id = p_user)
           and ord.status not in ('pending', 'cancelled')) e,
       (select round(coalesce(sum(pr.amount), 0), 2) as paid_out from public.payout_requests pr
         where pr.user_id = p_user and pr.status in ('approved', 'completed') and pr.id is distinct from p_exclude) o
$$;

-- ── 4. Списки раздела одной функцией: вкладка, поиск, постранично ──
-- p_view: review (оплаты на проверке), payments (все платежи), ledger (журнал баланса), refunds (возвраты),
--         payouts (выплаты), recon (сверка), expenses (расходы)
create or replace function public.admin_money_list(p_view text default 'review', p_search text default null,
                                                   p_limit integer default 20, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_q text := nullif(trim(coalesce(p_search, '')), '');
  v_like text;
  v_lim integer := greatest(least(coalesce(p_limit, 20), 100), 1);
  v_off integer := greatest(coalesce(p_offset, 0), 0);
  v_rows jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_sum numeric := 0;
  v_counts jsonb;
  v_month timestamptz := date_trunc('month', now() at time zone 'Europe/Minsk') at time zone 'Europe/Minsk';
begin
  perform public.admin_require('admin');
  if p_view not in ('review', 'payments', 'ledger', 'refunds', 'payouts', 'recon', 'expenses') then
    raise exception 'Неизвестный раздел';
  end if;
  v_like := '%' || replace(replace(replace(ltrim(coalesce(v_q, ''), '#@'), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  v_counts := jsonb_build_object(
    'review',  (select count(*) from public.payments where provider = 'manual' and status in ('PENDING', 'REQUIRES_REVIEW')),
    'payouts', (select count(*) from public.payout_requests where status in ('pending', 'approved')),
    'recon',   (select count(*) from public.admin_recon_rows()));

  if p_view in ('review', 'payments') then
    with base as (
      select p.*, u.full_name as u_name, u.username as u_nick,
             coalesce(nullif(ord.title_translated, ''), nullif(ord.title, ''), nullif(ord.title_original, ''), ord.items -> 0 ->> 'title') as o_title,
             ord.status as o_status
        from public.payments p
        left join public.users u on u.user_id = p.user_id
        left join public.orders ord on ord.id = p.order_id
       where (p_view = 'payments' or (p.provider = 'manual' and p.status in ('PENDING', 'REQUIRES_REVIEW')))
         and (v_q is null or p.id::text ilike v_like or coalesce(p.order_id::text, '') ilike v_like
              or p.user_id::text ilike v_like or u.full_name ilike v_like or u.username ilike v_like)
    )
    select count(*), coalesce(sum(amount), 0) into v_total, v_sum from base;
    with base as (
      select p.*, u.full_name as u_name, u.username as u_nick,
             coalesce(nullif(ord.title_translated, ''), nullif(ord.title, ''), nullif(ord.title_original, ''), ord.items -> 0 ->> 'title') as o_title,
             ord.status as o_status
        from public.payments p
        left join public.users u on u.user_id = p.user_id
        left join public.orders ord on ord.id = p.order_id
       where (p_view = 'payments' or (p.provider = 'manual' and p.status in ('PENDING', 'REQUIRES_REVIEW')))
         and (v_q is null or p.id::text ilike v_like or coalesce(p.order_id::text, '') ilike v_like
              or p.user_id::text ilike v_like or u.full_name ilike v_like or u.username ilike v_like)
       order by case when p_view = 'review' then p.created_at end asc, p.created_at desc
       limit v_lim offset v_off
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'kind', 'payment', 'id', b.id, 'user_id', b.user_id, 'name', b.u_name, 'nick', b.u_nick,
             'order_id', b.order_id, 'order_title', b.o_title, 'order_status', b.o_status,
             'type', b.type, 'method', b.method, 'provider', b.provider, 'amount', b.amount, 'status', b.status,
             'failure_reason', b.failure_reason, 'created_at', b.created_at, 'paid_at', b.paid_at, 'expires_at', b.expires_at)
           order by case when p_view = 'review' then b.created_at end asc, b.created_at desc), '[]'::jsonb)
      into v_rows from base b;

  elsif p_view = 'ledger' then
    with base as (
      select b.*, public.admin_money_reason(b.reason, b.type) as label,
             u.full_name as u_name, u.username as u_nick, c.full_name as c_name, c.username as c_nick
        from public.balance_entries b
        left join public.users u on u.user_id = b.user_id
        left join public.users c on c.user_id = b.created_by
    ), picked as (
      select * from base
       where v_q is null or user_id::text ilike v_like or u_name ilike v_like or u_nick ilike v_like
          or label ilike v_like or coalesce(reason, '') ilike v_like or coalesce(order_id::text, '') ilike v_like
    )
    select (select count(*) from picked),
           (select coalesce(sum(case when direction = 'CREDIT' then amount else -amount end), 0) from picked),
           (select coalesce(jsonb_agg(jsonb_build_object(
              'kind', 'ledger', 'id', x.id, 'user_id', x.user_id, 'name', x.u_name, 'nick', x.u_nick,
              'order_id', x.order_id, 'payment_id', x.payment_id, 'type', x.type, 'direction', x.direction,
              'amount', x.amount, 'balance_after', x.balance_after, 'label', x.label,
              'by_id', x.created_by, 'by_name', coalesce(x.c_name, x.c_nick), 'created_at', x.created_at)
              order by x.created_at desc), '[]'::jsonb)
              from (select * from picked order by created_at desc limit v_lim offset v_off) x)
      into v_total, v_sum, v_rows;

  elsif p_view = 'refunds' then
    with picked as (
      select r.*, u.full_name as u_name, u.username as u_nick,
             coalesce(nullif(ord.title_translated, ''), nullif(ord.title, ''), nullif(ord.title_original, ''), ord.items -> 0 ->> 'title') as o_title
        from public.refunds r
        left join public.users u on u.user_id = r.user_id
        left join public.orders ord on ord.id = r.order_id
       where v_q is null or r.user_id::text ilike v_like or u.full_name ilike v_like or u.username ilike v_like
          or coalesce(r.order_id::text, '') ilike v_like or coalesce(r.reason, '') ilike v_like
    )
    select (select count(*) from picked),
           (select coalesce(sum(amount), 0) from picked where status = 'COMPLETED'),
           (select coalesce(jsonb_agg(jsonb_build_object(
              'kind', 'refund', 'id', x.id, 'user_id', x.user_id, 'name', x.u_name, 'nick', x.u_nick,
              'order_id', x.order_id, 'order_title', x.o_title, 'amount', x.amount, 'destination', x.destination,
              'status', x.status, 'reason', x.reason, 'created_at', x.created_at, 'completed_at', x.completed_at)
              order by x.created_at desc), '[]'::jsonb)
              from (select * from picked order by created_at desc limit v_lim offset v_off) x)
      into v_total, v_sum, v_rows;

  elsif p_view = 'payouts' then
    with picked as (
      select pr.*, u.full_name as u_name, u.username as u_nick,
             case when u.encrypted_card like 'v1:%' then split_part(u.encrypted_card, ':', 2) end as last4,
             case pr.status when 'pending' then 0 when 'approved' then 1 when 'completed' then 2 else 3 end as ord_key
        from public.payout_requests pr
        left join public.users u on u.user_id = pr.user_id
       where v_q is null or pr.user_id::text ilike v_like or u.full_name ilike v_like or u.username ilike v_like
    )
    select (select count(*) from picked),
           (select coalesce(sum(amount), 0) from picked where status in ('pending', 'approved')),
           (select coalesce(jsonb_agg(jsonb_build_object(
              'kind', 'payout', 'id', x.id, 'user_id', x.user_id, 'name', x.u_name, 'nick', x.u_nick,
              'amount', x.amount, 'status', x.status, 'last4', x.last4,
              'created_at', x.created_at, 'processed_at', x.processed_at,
              'stats', public.admin_payout_stats(x.user_id, x.id))
              order by x.ord_key, x.created_at desc), '[]'::jsonb)
              from (select * from picked order by ord_key, created_at desc limit v_lim offset v_off) x)
      into v_total, v_sum, v_rows;

  elsif p_view = 'recon' then
    with picked as (
      select r.*, u.full_name as u_name, u.username as u_nick,
             coalesce(nullif(ord.title_translated, ''), nullif(ord.title, ''), nullif(ord.title_original, ''), ord.items -> 0 ->> 'title') as o_title
        from public.admin_recon_rows() r
        left join public.users u on u.user_id = r.user_id
        left join public.orders ord on ord.id = r.order_id
       where v_q is null or r.order_id::text ilike v_like or r.user_id::text ilike v_like
          or u.full_name ilike v_like or u.username ilike v_like
    )
    select (select count(*) from picked), 0,
           (select coalesce(jsonb_agg(jsonb_build_object(
              'kind', 'recon', 'id', x.order_id, 'order_id', x.order_id, 'user_id', x.user_id, 'name', x.u_name, 'nick', x.u_nick,
              'order_title', x.o_title, 'status', x.status, 'total', x.total, 'total_paid', x.total_paid,
              'total_refunded', x.total_refunded, 'paid_payments', x.paid_payments, 'paid_balance', x.paid_balance,
              'refunds_done', x.refunds_done, 'refunds_balance', x.refunds_balance,
              'balance_refund_credits', x.balance_refund_credits, 'issues', to_jsonb(x.issues), 'created_at', x.created_at)
              order by x.created_at desc), '[]'::jsonb)
              from (select * from picked order by created_at desc limit v_lim offset v_off) x)
      into v_total, v_sum, v_rows;

  else -- expenses
    with picked as (
      select e.* from public.expenses e
       where v_q is null or coalesce(e.category, '') ilike v_like or coalesce(e.description, '') ilike v_like
    )
    select (select count(*) from picked),
           (select coalesce(sum(amount), 0) from picked),
           (select coalesce(jsonb_agg(jsonb_build_object(
              'kind', 'expense', 'id', x.id, 'amount', x.amount, 'category', x.category,
              'description', x.description, 'created_at', x.created_at)
              order by x.created_at desc), '[]'::jsonb)
              from (select * from picked order by created_at desc limit v_lim offset v_off) x)
      into v_total, v_sum, v_rows;
    v_counts := v_counts || jsonb_build_object('expenses_month',
      (select coalesce(sum(amount), 0) from public.expenses where created_at >= v_month));
  end if;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'sum', round(v_sum, 2), 'counts', v_counts);
end $$;

-- ── 5. Подтвердить / отклонить заявку «Я оплатил»: проверки, журнал действий ──
-- Подписи прежние (их вызывает и старая админка), поведение строже:
--  · только заявки на ручную проверку (provider = manual) или спорные (REQUIRES_REVIEW);
--  · нельзя зачесть деньги в отменённый заказ или в уже закрытый этап — деньги «зависли» бы в заказе;
--  · повторное нажатие ничего не делает, ошибка — понятным текстом.
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
  if p.order_id is not null then
    select * into o from public.orders where id = p.order_id for update;
    if found and o.status = 'cancelled' then
      raise exception 'Заказ отменён. Отклоните заявку, а пришедшие деньги верните клиенту на баланс';
    end if;
    if found and ((p.type = 'FIRST_PAYMENT' and coalesce(o.first_payment_paid, false))
               or (p.type = 'SECOND_PAYMENT' and coalesce(o.second_payment_paid, false))) then
      raise exception 'Этот этап заказа уже оплачен. Отклоните заявку, а пришедшие деньги верните клиенту на баланс';
    end if;
  end if;
  v := public.payment_settle(p.id, null, v_me);
  perform public.admin_log('payment_confirm', 'payment', p.id::text,
    jsonb_build_object('amount', p.amount, 'type', p.type, 'method', p.method, 'user_id', p.user_id, 'order_id', p.order_id));
  return v;
end $$;

create or replace function public.admin_reject_payment(p_payment_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  p public.payments;
  v_reason text := left(coalesce(nullif(trim(p_reason), ''), 'Оплата не найдена'), 300);
begin
  select * into p from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Заявка не найдена';
  end if;
  if p.status = 'DECLINED' then
    return;
  end if;
  if p.status not in ('CREATED', 'PENDING', 'REQUIRES_REVIEW') then
    raise exception 'Заявка уже обработана, отклонить её нельзя';
  end if;
  if coalesce(p.provider, 'manual') <> 'manual' and p.status <> 'REQUIRES_REVIEW' then
    raise exception 'Этот платёж ведёт платёжная система, а не сотрудник';
  end if;
  update public.payments set status = 'DECLINED', failure_reason = v_reason, confirmed_by = v_me where id = p.id;
  perform public.admin_log('payment_reject', 'payment', p.id::text,
    jsonb_build_object('amount', p.amount, 'type', p.type, 'method', p.method, 'user_id', p.user_id, 'order_id', p.order_id, 'reason', v_reason));
end $$;

-- ── 6. Выплаты дропшипперам ──
-- approve: заявка в ожидании, сумма не больше доступного заработка (считает сервер);
-- paid: деньги переведены на карту; reject: с причиной (в журнал действий).
-- Баланс приложения не трогается: заработок дропшиппера живёт отдельно (наценка drop_margin).
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
    if r.status <> 'pending' then
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
    if r.status <> 'approved' then
      raise exception 'Сначала одобрите заявку';
    end if;
    update public.payout_requests set status = 'completed', processed_at = now() where id = r.id;
    perform public.admin_log('payout_paid', 'payout', r.id::text, jsonb_build_object('user_id', r.user_id, 'amount', r.amount));
    return jsonb_build_object('status', 'completed');

  else
    if r.status = 'rejected' then
      return jsonb_build_object('status', 'rejected', 'already', true);
    end if;
    if r.status not in ('pending', 'approved') then
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

-- Номер карты для перевода: только по одобренной заявке, каждый просмотр — в журнал действий
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
  if r.status <> 'approved' then
    raise exception 'Карту можно посмотреть только по одобренной заявке';
  end if;
  v_card := public.admin_get_payout_card(r.user_id);
  perform public.admin_log('payout_card_view', 'payout', r.id::text, jsonb_build_object('user_id', r.user_id, 'found', v_card is not null));
  return jsonb_build_object('card', v_card);
end $$;

-- ── 7. Сверка: отметить заказ проверенным (с комментарием в истории заказа) ──
create or replace function public.admin_recon_resolve(p_order uuid, p_comment text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  r record;
begin
  if coalesce(trim(p_comment), '') = '' then
    raise exception 'Напишите, что проверили';
  end if;
  select * into r from public.admin_recon_rows() x where x.order_id = p_order;
  if not found then
    raise exception 'По этому заказу расхождений нет';
  end if;
  perform public.order_event(p_order, 'PROBLEM_ORDER_RESOLVED', 'OPERATOR',
    jsonb_build_object('sig', r.sig, 'issues', to_jsonb(r.issues), 'total_paid', r.total_paid, 'total_refunded', r.total_refunded),
    left(trim(p_comment), 500));
  perform public.admin_log('recon_resolve', 'order', p_order::text,
    jsonb_build_object('issues', to_jsonb(r.issues), 'comment', left(trim(p_comment), 500)));
  return jsonb_build_object('ok', true);
end $$;

-- ── 8. Расходы: простой учёт ──
create or replace function public.admin_expense_add(p_amount numeric, p_category text, p_description text default null, p_date date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  v_amount numeric := round(coalesce(p_amount, 0), 2);
  v_cat text := trim(coalesce(p_category, ''));
  v_desc text := nullif(trim(coalesce(p_description, '')), '');
  v_today date := (now() at time zone 'Europe/Minsk')::date;
  v_at timestamptz;
  v_id uuid;
begin
  if v_amount <= 0 or v_amount > 1000000 then
    raise exception 'Сумма от 0,01 до 1 000 000';
  end if;
  if v_cat = '' then
    raise exception 'Укажите статью расхода';
  end if;
  if length(v_cat) > 60 or length(coalesce(v_desc, '')) > 500 then
    raise exception 'Слишком длинный текст';
  end if;
  if p_date is not null and (p_date > v_today or p_date < date '2020-01-01') then
    raise exception 'Проверьте дату: не в будущем';
  end if;
  v_at := case when p_date is null or p_date = v_today then now()
               else (p_date::timestamp + time '12:00') at time zone 'Europe/Minsk' end;
  insert into public.expenses (amount, category, description, created_at)
  values (v_amount, v_cat, v_desc, v_at)
  returning id into v_id;
  perform public.admin_log('expense_add', 'expense', v_id::text,
    jsonb_build_object('amount', v_amount, 'category', v_cat, 'description', v_desc, 'date', coalesce(p_date, v_today)));
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.admin_expense_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  e public.expenses;
begin
  delete from public.expenses where id = p_id returning * into e;
  if not found then
    raise exception 'Расход не найден';
  end if;
  -- удалённая запись целиком остаётся в журнале действий: её можно восстановить
  perform public.admin_log('expense_delete', 'expense', e.id::text, to_jsonb(e));
  return jsonb_build_object('ok', true);
end $$;

-- ── 9. Отчёт за период (даты по Минску, включительно) ──
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
    select o.* from public.orders o where o.created_at >= v_from and o.created_at < v_to
  ), live as (
    select * from ord where status not in ('pending', 'cancelled')
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
      'unpaid',     (select count(*) from ord where status = 'pending')),
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

-- ── 10. Права: функции раздела — только вошедшим (внутри проверка роли), помощники — никому снаружи ──
revoke all on function
  public.admin_money_reason(text, text), public.admin_recon_rows(), public.admin_payout_stats(bigint, uuid)
  from public, anon, authenticated;

revoke all on function
  public.admin_money_list(text, text, integer, integer), public.admin_payout_decision(uuid, text, text),
  public.admin_payout_card(uuid), public.admin_recon_resolve(uuid, text),
  public.admin_expense_add(numeric, text, text, date), public.admin_expense_delete(uuid),
  public.admin_money_report(date, date), public.admin_confirm_payment(uuid), public.admin_reject_payment(uuid, text)
  from public, anon;
grant execute on function
  public.admin_money_list(text, text, integer, integer), public.admin_payout_decision(uuid, text, text),
  public.admin_payout_card(uuid), public.admin_recon_resolve(uuid, text),
  public.admin_expense_add(numeric, text, text, date), public.admin_expense_delete(uuid),
  public.admin_money_report(date, date), public.admin_confirm_payment(uuid), public.admin_reject_payment(uuid, text)
  to authenticated;
