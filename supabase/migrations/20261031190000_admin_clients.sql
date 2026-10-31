-- Новая админка, этап 3 «Клиенты и Паспорта» (ADMIN_PLAN.md).
-- 1) Бан теперь настоящий: заблокированный клиент не может оформить новый заказ и внести первый платёж (раньше флаг is_banned нигде не проверялся).
-- 2) Список клиентов с поиском и фильтрами, карточка клиента одним запросом, ограничения (бан, предупреждение, токсичность).
-- 3) Очередь паспортов: решение «подтвердить / отклонить» на сервере, клиенту уходит уведомление, каждый просмотр фото пишется в admin_logs.
-- Откат: supabase/rollback/20261031190000_admin_clients_rollback.sql

-- ── 1. Проверка бана ──
-- Бессрочный бан: ban_expires_at пустой. Срочный: действует, пока срок не вышел (ban_expires_at хранится в UTC без часового пояса).
create or replace function public.ban_check() returns void
language plpgsql stable security definer set search_path = public as $$
declare
  u record;
begin
  select is_banned, ban_expires_at into u from public.users where user_id = public.app_uid();
  if found and coalesce(u.is_banned, false)
     and (u.ban_expires_at is null or u.ban_expires_at > (now() at time zone 'utc')) then
    raise exception 'Оформление заказов сейчас недоступно: аккаунт ограничен. Напишите в поддержку.' using errcode = '42501';
  end if;
end $$;

-- Новый заказ клиента: проверка бана. Триггер остаётся без security definer: app_is_privileged смотрит на current_user.
create or replace function public.orders_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.app_is_privileged() then
    return new;
  end if;
  perform public.ban_check();
  new.status := 'pending';
  new.first_payment_paid := false;
  new.second_payment_paid := false;
  new.total_paid := 0;
  new.total_refunded := 0;
  new.balance_used := 0;
  new.amount_due := 0;
  new.referral_reward_processed := false;
  new.referral_reward_amount := 0;
  new.weight_final := null;
  new.weight_actual := null;
  new.delivered_at := null;
  new.flags := coalesce(new.flags, '[]'::jsonb) || '["client_priced"]'::jsonb;  -- цену посчитал браузер: сверить перед выкупом
  if new.auto_cancel_reason is distinct from 'family_approval_pending' then
    new.auto_cancel_reason := null;
  end if;
  return new;
end $$;

-- Первый платёж: проверка бана. Второй (доплата по уже выкупленному заказу) не блокируем: заказ уже в работе.
create or replace function public.order_pay(p_order_id uuid, p_stage text default 'FIRST', p_use_balance numeric default 0, p_method text default 'manual') returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  o public.orders;
  v_due numeric;
  v_from_balance numeric := 0;
  v_balance numeric;
  v_rest numeric;
  v_payment uuid;
  v_type text;
begin
  if p_stage not in ('FIRST', 'SECOND') then
    raise exception 'Неизвестный этап оплаты';
  end if;
  if p_stage = 'FIRST' then
    perform public.ban_check();
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id is distinct from v_uid then
    raise exception 'Заказ не найден';
  end if;
  if o.status = 'cancelled' then
    raise exception 'Заказ отменён';
  end if;
  if o.auto_cancel_reason = 'family_approval_pending' then
    raise exception 'Этот заказ оплатит глава семейного бюджета';
  end if;
  if p_stage = 'FIRST' and o.first_payment_paid then
    return jsonb_build_object('status', 'paid', 'already', true);
  end if;
  if p_stage = 'SECOND' and (not o.first_payment_paid or o.second_payment_paid or o.status <> 'awaiting_payment' or coalesce(o.amount_due, 0) <= 0) then
    raise exception 'Второй платёж сейчас не нужен';
  end if;

  v_due := public.order_stage_due(o, p_stage);
  select ices_balance into v_balance from public.users where user_id = v_uid for update;
  v_from_balance := least(greatest(round(coalesce(p_use_balance, 0), 2), 0), v_due, coalesce(v_balance, 0));

  if v_from_balance > 0 then
    perform public.wallet_move(v_uid, v_from_balance, 'DEBIT', 'USED_FOR_ORDER', 'ORDER_PAYMENT', o.id, null,
                               'order:' || o.id || ':' || p_stage || ':' || gen_random_uuid());
    update public.orders
       set total_paid = coalesce(total_paid, 0) + v_from_balance,
           balance_used = coalesce(balance_used, 0) + v_from_balance,
           amount_due = case when p_stage = 'SECOND' then greatest(coalesce(amount_due, 0) - v_from_balance, 0) else amount_due end,
           updated_at = now()
     where id = o.id;
    perform public.order_event(o.id, 'BALANCE_USED', 'CLIENT', jsonb_build_object('stage', p_stage, 'amount', v_from_balance));
  end if;

  v_rest := round(v_due - v_from_balance, 2);
  if v_rest <= 0 then
    perform public.order_close_stage_if_paid(o.id, p_stage);
    select ices_balance into v_balance from public.users where user_id = v_uid;
    return jsonb_build_object('status', 'paid', 'from_balance', v_from_balance, 'balance', v_balance);
  end if;

  -- Остаток: заявка на оплату. Старая неоплаченная заявка по этому этапу отменяется.
  v_type := case when p_stage = 'FIRST' then 'FIRST_PAYMENT' else 'SECOND_PAYMENT' end;
  update public.payments set status = 'CANCELLED'
   where order_id = o.id and type = v_type and status in ('CREATED', 'PENDING');
  insert into public.payments (order_id, user_id, type, method, amount, status, provider, created_by, expires_at)
  values (o.id, v_uid, v_type, case when p_method in ('manual', 'erip', 'oplati', 'card', 'card_token') then p_method else 'manual' end,
          v_rest, 'PENDING', 'manual', v_uid, now() + interval '3 days')
  returning id into v_payment;
  select ices_balance into v_balance from public.users where user_id = v_uid;
  return jsonb_build_object('status', 'pending', 'payment_id', v_payment, 'remaining', v_rest,
                            'from_balance', v_from_balance, 'balance', v_balance);
end $$;

-- ── 2. Новый вид сообщения клиенту: решение по паспорту ──
alter table public.notification_queue drop constraint if exists notification_queue_kind_check;
alter table public.notification_queue add constraint notification_queue_kind_check
  check (kind = any (array['order_status', 'promotion', 'news', 'currency', 'security', 'kyc_status']));

-- ── 3. Ограничения: бан, снятие бана, предупреждение, пометка «сложный» ──
-- Как в боте (moderation.py): три предупреждения = бессрочный бан. Владельца ограничить нельзя, администратора — только владельцу.
create or replace function public.admin_user_restrict(p_user bigint, p_action text, p_reason text default null, p_days integer default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  t public.users;
  v_reason text := left(nullif(trim(coalesce(p_reason, '')), ''), 300);
  v_exp timestamp;
  v_warn integer;
  v_auto boolean := false;
begin
  if p_action not in ('ban', 'unban', 'warn', 'toxic', 'untoxic') then
    raise exception 'Неизвестное действие';
  end if;
  select * into t from public.users where user_id = p_user for update;
  if not found then
    raise exception 'Клиент не найден';
  end if;
  if t.user_id = v_me then
    raise exception 'Нельзя ограничить самого себя';
  end if;
  if t.role = 'owner' or (t.role = 'admin' and not public.app_is_owner()) then
    raise exception 'Этого сотрудника ограничить нельзя';
  end if;

  if p_action = 'ban' then
    if v_reason is null or char_length(v_reason) < 3 then
      raise exception 'Укажите причину блокировки';
    end if;
    if p_days is not null and (p_days < 1 or p_days > 365) then
      raise exception 'Срок блокировки: от 1 до 365 дней или без срока';
    end if;
    v_exp := case when p_days is null then null else (now() at time zone 'utc') + make_interval(days => p_days) end;
    update public.users set is_banned = true, ban_reason = v_reason, ban_expires_at = v_exp where user_id = t.user_id;
    perform public.admin_log('ban_user', 'user', t.user_id::text, jsonb_build_object('reason', v_reason, 'days', p_days));
  elsif p_action = 'unban' then
    if not coalesce(t.is_banned, false) then
      raise exception 'Клиент не заблокирован';
    end if;
    update public.users set is_banned = false, ban_reason = null, ban_expires_at = null where user_id = t.user_id;
    perform public.admin_log('unban_user', 'user', t.user_id::text, '{}'::jsonb);
  elsif p_action = 'warn' then
    if v_reason is null or char_length(v_reason) < 3 then
      raise exception 'Укажите, за что предупреждение';
    end if;
    v_warn := coalesce(t.warnings_count, 0) + 1;
    update public.users set warnings_count = v_warn where user_id = t.user_id;
    perform public.admin_log('warn_user', 'user', t.user_id::text, jsonb_build_object('reason', v_reason, 'warnings_count', v_warn));
    if v_warn >= 3 and not coalesce(t.is_banned, false) then
      update public.users set is_banned = true, ban_reason = 'Автоблокировка: 3 предупреждения', ban_expires_at = null where user_id = t.user_id;
      perform public.admin_log('ban_user', 'user', t.user_id::text, jsonb_build_object('reason', 'Автоблокировка: 3 предупреждения', 'days', null, 'auto', true));
      v_auto := true;
    end if;
  elsif p_action = 'toxic' then
    update public.users set is_toxic = true where user_id = t.user_id;
    perform public.admin_log('mark_toxic', 'user', t.user_id::text, jsonb_build_object('reason', v_reason));
  else
    update public.users set is_toxic = false where user_id = t.user_id;
    perform public.admin_log('unmark_toxic', 'user', t.user_id::text, '{}'::jsonb);
  end if;

  select * into t from public.users where user_id = p_user;
  return jsonb_build_object('banned', coalesce(t.is_banned, false), 'ban_reason', t.ban_reason, 'ban_expires_at', t.ban_expires_at,
                            'warnings', coalesce(t.warnings_count, 0), 'toxic', coalesce(t.is_toxic, false), 'auto_ban', v_auto);
end $$;

-- ── 4. Список клиентов: поиск и фильтры на сервере ──
-- Фильтры: all, new (за 7 дней), balance (есть деньги на балансе), orders (были заказы), hard (сложные: токсичные или с предупреждениями),
-- banned (блокировка действует сейчас), dropship (дропшипперы).
create or replace function public.admin_clients_list(p_filter text default 'all', p_search text default null, p_limit integer default 20, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_q text := nullif(trim(coalesce(p_search, '')), '');
  v_like text;
  v_now timestamp := now() at time zone 'utc';
  v_rows jsonb;
  v_total integer;
  v_counts jsonb;
begin
  perform public.admin_require('admin');
  v_like := '%' || replace(replace(replace(ltrim(coalesce(v_q, ''), '#@'), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  with base as (
    select u.user_id, u.full_name, u.username, u.role, u.phone, u.ices_balance, u.created_at, u.last_activity_date,
           u.is_banned, u.ban_expires_at, u.is_toxic, u.warnings_count, u.kyc_status, u.is_trusted,
           (coalesce(u.is_banned, false) and (u.ban_expires_at is null or u.ban_expires_at > v_now)) as ban_active,
           exists (select 1 from public.orders o where o.user_id = u.user_id) as has_orders,
           exists (select 1 from public.dropshipper_settings d where d.user_id = u.user_id) as is_drop
      from public.users u
     where v_q is null
        or u.user_id::text ilike v_like or u.telegram_id::text ilike v_like
        or u.full_name ilike v_like or u.username ilike v_like or u.phone ilike v_like or u.referral_code ilike v_like
  ), picked as (
    select b.*, row_number() over (
             order by case when p_filter = 'balance' then b.ices_balance end desc nulls last, b.created_at desc) as rn
      from base b
     where case coalesce(p_filter, 'all')
             when 'new' then b.created_at > v_now - interval '7 days'
             when 'balance' then coalesce(b.ices_balance, 0) > 0
             when 'orders' then b.has_orders
             when 'hard' then coalesce(b.is_toxic, false) or coalesce(b.warnings_count, 0) > 0
             when 'banned' then b.ban_active
             when 'dropship' then b.is_drop
             else true end
  )
  select
    (select count(*) from picked),
    (select jsonb_build_object(
        'all', count(*),
        'new', count(*) filter (where created_at > v_now - interval '7 days'),
        'balance', count(*) filter (where coalesce(ices_balance, 0) > 0),
        'orders', count(*) filter (where has_orders),
        'hard', count(*) filter (where coalesce(is_toxic, false) or coalesce(warnings_count, 0) > 0),
        'banned', count(*) filter (where ban_active),
        'dropship', count(*) filter (where is_drop)) from base),
    (select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', p.user_id, 'name', p.full_name, 'nick', p.username, 'role', p.role, 'phone', p.phone,
        'balance', coalesce(p.ices_balance, 0), 'created_at', p.created_at, 'last_activity', p.last_activity_date,
        'banned', p.ban_active, 'toxic', coalesce(p.is_toxic, false), 'warnings', coalesce(p.warnings_count, 0),
        'kyc', p.kyc_status, 'trusted', coalesce(p.is_trusted, false), 'dropship', p.is_drop,
        'orders', (select count(*) from public.orders o where o.user_id = p.user_id)
      ) order by p.rn), '[]'::jsonb)
      from picked p
     where p.rn > greatest(coalesce(p_offset, 0), 0)
       and p.rn <= greatest(coalesce(p_offset, 0), 0) + greatest(least(coalesce(p_limit, 20), 50), 1))
  into v_total, v_counts, v_rows;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'counts', v_counts);
end $$;

-- ── 5. Карточка клиента одним запросом ──
-- Паспортных данных здесь нет: только статус проверки и ссылка на заявку. Сами данные и фото — в admin_kyc_card / admin_kyc_photo.
create or replace function public.admin_client_card(p_user bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  u public.users;
  v_now timestamp := now() at time zone 'utc';
  v_kyc_last uuid;
begin
  perform public.admin_require('admin');
  select * into u from public.users where user_id = p_user;
  if not found then raise exception 'Клиент не найден'; end if;
  select k.id into v_kyc_last from public.kyc_verifications k where k.user_id = u.user_id order by k.created_at desc limit 1;
  return jsonb_build_object(
    'profile', jsonb_build_object(
      'user_id', u.user_id, 'telegram_id', u.telegram_id, 'name', u.full_name, 'nick', u.username, 'phone', u.phone, 'role', u.role,
      'created_at', u.created_at, 'last_activity', u.last_activity_date, 'level', u.client_level, 'trusted', coalesce(u.is_trusted, false),
      'toxic', coalesce(u.is_toxic, false), 'warnings', coalesce(u.warnings_count, 0),
      'banned', coalesce(u.is_banned, false) and (u.ban_expires_at is null or u.ban_expires_at > v_now),
      'ban_reason', u.ban_reason, 'ban_expires_at', u.ban_expires_at,
      'balance', coalesce(u.ices_balance, 0), 'referral_count', coalesce(u.referral_count, 0),
      'referrer', (select jsonb_build_object('user_id', r.user_id, 'name', r.full_name, 'nick', r.username) from public.users r where r.user_id = u.referrer_id)),
    'kyc', jsonb_build_object('status', u.kyc_status, 'submitted_at', u.kyc_submitted_at, 'verified_at', u.kyc_verified_at,
                              'reason', u.kyc_rejection_reason, 'last_id', v_kyc_last),
    'dropshipper', (select jsonb_build_object('margin_type', d.margin_type, 'margin_value', d.margin_value, 'self_employed', d.is_self_employed)
                      from public.dropshipper_settings d where d.user_id = u.user_id),
    'orders_total', (select count(*) from public.orders o where o.user_id = u.user_id),
    'orders', (select coalesce(jsonb_agg(s.x order by s.at desc), '[]'::jsonb) from (
        select jsonb_build_object('id', o.id, 'status', o.status, 'created_at', o.created_at, 'archived', o.archived_at is not null,
                 'title', coalesce(nullif(o.title_translated, ''), nullif(o.title, ''), nullif(o.title_original, ''), o.items -> 0 ->> 'title'),
                 'total', coalesce(o.total_byn, o.total_final, o.price_byn)) as x, o.created_at as at
          from public.orders o where o.user_id = u.user_id order by o.created_at desc limit 30) s),
    'ledger', (select coalesce(jsonb_agg(s.x order by s.at desc), '[]'::jsonb) from (
        select jsonb_build_object('id', b.id, 'type', b.type, 'direction', b.direction, 'amount', b.amount, 'reason', b.reason,
                 'order_id', b.order_id, 'balance_after', b.balance_after, 'at', b.created_at, 'by', b.created_by) as x, b.created_at as at
          from public.balance_entries b where b.user_id = u.user_id order by b.created_at desc limit 30) s),
    'referrals_total', (select count(*) from public.referrals r where r.referrer_id = u.user_id),
    'referrals', (select coalesce(jsonb_agg(s.x order by s.at desc), '[]'::jsonb) from (
        select jsonb_build_object('user_id', r.referred_id, 'name', ru.full_name, 'nick', ru.username, 'at', r.created_at,
                 'orders', (select count(*) from public.orders o where o.user_id = r.referred_id)) as x, r.created_at as at
          from public.referrals r left join public.users ru on ru.user_id = r.referred_id
         where r.referrer_id = u.user_id order by r.created_at desc limit 20) s),
    'tickets', (select coalesce(jsonb_agg(s.x order by s.at desc), '[]'::jsonb) from (
        select jsonb_build_object('id', t.id, 'number', t.number, 'status', t.status, 'subject', t.subject,
                 'last', t.last_message_text, 'at', coalesce(t.last_message_at, t.created_at)) as x, coalesce(t.last_message_at, t.created_at) as at
          from public.support_tickets t where t.user_id = u.user_id order by coalesce(t.last_message_at, t.created_at) desc limit 10) s),
    'history', (select coalesce(jsonb_agg(s.x order by s.at desc), '[]'::jsonb) from (
        select jsonb_build_object('action', l.action, 'details', l.details, 'at', l.created_at, 'admin', a.full_name) as x, l.created_at as at
          from public.admin_logs l left join public.users a on a.user_id = l.admin_id
         where l.target_type = 'user' and l.target_id = u.user_id::text order by l.created_at desc limit 20) s)
  );
end $$;

-- ── 6. Паспорта: очередь, карточка, фото, решение ──
create or replace function public.admin_kyc_list(p_status text default 'pending', p_limit integer default 20, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_rows jsonb;
  v_total integer;
  v_counts jsonb;
begin
  perform public.admin_require('admin');
  select
    (select count(*) from public.kyc_verifications k where coalesce(p_status, 'pending') = 'all' or k.status = coalesce(p_status, 'pending')),
    (select coalesce(jsonb_object_agg(c.status, c.n), '{}'::jsonb) from (select status, count(*) n from public.kyc_verifications group by status) c),
    (select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'user_id', p.user_id, 'name', u.full_name, 'nick', u.username, 'status', p.status,
        'created_at', p.created_at, 'moderated_at', p.moderated_at, 'moderator', m.full_name, 'reason', p.rejection_reason,
        'has_photo', coalesce(p.photo_url, '') like '%/kyc-documents/%'
      ) order by p.rn), '[]'::jsonb)
      from (select k.*, row_number() over (
                     order by case when k.status = 'pending' then k.created_at end asc nulls last, k.created_at desc) as rn
              from public.kyc_verifications k
             where coalesce(p_status, 'pending') = 'all' or k.status = coalesce(p_status, 'pending')) p
      left join public.users u on u.user_id = p.user_id
      left join public.users m on m.user_id = p.moderated_by
     where p.rn > greatest(coalesce(p_offset, 0), 0)
       and p.rn <= greatest(coalesce(p_offset, 0), 0) + greatest(least(coalesce(p_limit, 20), 50), 1))
  into v_total, v_counts, v_rows;
  return jsonb_build_object('rows', v_rows, 'total', v_total, 'counts', v_counts);
end $$;

-- Карточка заявки: номер и серия документа скрыты (видны последние 3 знака), адреса и телефона нет. Полный документ — только на фото.
create or replace function public.admin_kyc_card(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  k public.kyc_verifications;
  u public.users;
begin
  perform public.admin_require('admin');
  select * into k from public.kyc_verifications where id = p_id;
  if not found then raise exception 'Заявка не найдена'; end if;
  select * into u from public.users where user_id = k.user_id;
  return jsonb_build_object(
    'id', k.id, 'status', k.status, 'created_at', k.created_at, 'moderated_at', k.moderated_at, 'reason', k.rejection_reason,
    'moderator', (select m.full_name from public.users m where m.user_id = k.moderated_by),
    'user', jsonb_build_object('user_id', u.user_id, 'name', u.full_name, 'nick', u.username),
    'doc', jsonb_build_object(
      'full_name', k.full_name, 'birth_date', k.birth_date, 'age', k.age, 'gender', k.gender, 'is_adult', k.is_adult,
      'parental_consent', k.parental_consent,
      'number_tail', case when k.id_number is null then null else right(k.id_number, 3) end,
      'series_tail', case when k.series_number is null then null else right(k.series_number, 3) end,
      'issue_date', k.validation_stage1_result ->> 'issue_date', 'issued_by', k.validation_stage1_result ->> 'issued_by'),
    'has_photo', coalesce(k.photo_url, '') like '%/kyc-documents/%',
    'others', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'status', o.status, 'at', o.created_at, 'reason', o.rejection_reason) order by o.created_at desc), '[]'::jsonb)
                 from public.kyc_verifications o where o.user_id = k.user_id and o.id <> k.id));
end $$;

-- Каждый просмотр фото записывается в журнал. Адрес файла выдаётся только после записи,
-- а политика хранилища (ниже) разрешает подписать ссылку лишь в течение пары минут после такой записи.
create or replace function public.admin_kyc_photo(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  k public.kyc_verifications;
  v_path text;
begin
  perform public.admin_require('admin');
  select * into k from public.kyc_verifications where id = p_id;
  if not found then raise exception 'Заявка не найдена'; end if;
  v_path := substring(coalesce(k.photo_url, '') from '/kyc-documents/([^?#]+)');
  if v_path is null or v_path = '' then
    raise exception 'Фото не сохранилось. Попросите клиента отправить паспорт заново';
  end if;
  perform public.admin_log('kyc_photo_view', 'kyc', k.id::text, jsonb_build_object('user_id', k.user_id, 'path', v_path));
  return jsonb_build_object('bucket', 'kyc-documents', 'path', v_path);
end $$;

create or replace function public.kyc_photo_allowed(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.app_is_admin() and exists (
    select 1 from public.admin_logs l
     where l.admin_id = public.app_uid() and l.action = 'kyc_photo_view' and l.details ->> 'path' = p_name
       and l.created_at > (now() at time zone 'utc') - interval '3 minutes')
$$;

drop policy if exists "kyc_admin_read_logged" on storage.objects;
create policy "kyc_admin_read_logged" on storage.objects for select to authenticated
  using (bucket_id = 'kyc-documents' and public.kyc_photo_allowed(name));

-- Решение по паспорту. Как в боте (kyc_moderation.py), плюс: свою заявку проверять нельзя, повторное решение — понятная ошибка,
-- причина отказа обязательна (клиент её увидит), клиенту уходит сообщение через notification_queue.
create or replace function public.admin_kyc_decision(p_id uuid, p_approve boolean, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  k public.kyc_verifications;
  v_reason text := left(nullif(trim(coalesce(p_reason, '')), ''), 300);
  v_now timestamptz := now();
begin
  select * into k from public.kyc_verifications where id = p_id for update;
  if not found then
    raise exception 'Заявка не найдена';
  end if;
  if k.status <> 'pending' then
    raise exception 'Эту заявку уже рассмотрели: %', case k.status when 'verified' then 'паспорт подтверждён' else 'паспорт отклонён' end;
  end if;
  if k.user_id = v_me then
    raise exception 'Свой паспорт проверять нельзя';
  end if;
  if exists (select 1 from public.kyc_verifications n where n.user_id = k.user_id and n.created_at > k.created_at) then
    raise exception 'Клиент уже прислал новую заявку. Откройте её';
  end if;
  if not p_approve and (v_reason is null or char_length(v_reason) < 3) then
    raise exception 'Укажите причину отказа: клиент увидит её';
  end if;

  update public.kyc_verifications
     set status = case when p_approve then 'verified' else 'rejected' end,
         rejection_reason = case when p_approve then null else v_reason end,
         moderated_by = v_me, moderated_at = v_now
   where id = k.id;
  if p_approve then
    update public.users set kyc_status = 'verified', kyc_verified_at = v_now, kyc_rejection_reason = null where user_id = k.user_id;
  else
    update public.users set kyc_status = 'rejected', kyc_rejection_reason = v_reason where user_id = k.user_id;
  end if;
  insert into public.notification_queue (user_id, kind, payload, dedupe_key)
  values (k.user_id, 'kyc_status',
          jsonb_build_object('status', case when p_approve then 'verified' else 'rejected' end, 'reason', case when p_approve then null else v_reason end),
          'kyc:' || k.id)
  on conflict (dedupe_key) do nothing;
  perform public.admin_log(case when p_approve then 'kyc_approve' else 'kyc_reject' end, 'kyc', k.id::text,
                           jsonb_build_object('user_id', k.user_id, 'reason', v_reason));
  return jsonb_build_object('status', case when p_approve then 'verified' else 'rejected' end);
end $$;

-- ── 7. Права ──
-- ban_check вызывается из триггера orders_guard от имени клиента, поэтому нужна и клиентам, и анониму (анон: app_uid пустой, проверка пройдёт).
revoke all on function public.ban_check() from public;
grant execute on function public.ban_check() to anon, authenticated;

revoke all on function public.admin_user_restrict(bigint, text, text, integer),
  public.admin_clients_list(text, text, integer, integer), public.admin_client_card(bigint),
  public.admin_kyc_list(text, integer, integer), public.admin_kyc_card(uuid), public.admin_kyc_photo(uuid),
  public.admin_kyc_decision(uuid, boolean, text), public.kyc_photo_allowed(text) from public, anon;
grant execute on function public.admin_user_restrict(bigint, text, text, integer),
  public.admin_clients_list(text, text, integer, integer), public.admin_client_card(bigint),
  public.admin_kyc_list(text, integer, integer), public.admin_kyc_card(uuid), public.admin_kyc_photo(uuid),
  public.admin_kyc_decision(uuid, boolean, text), public.kyc_photo_allowed(text) to authenticated;
