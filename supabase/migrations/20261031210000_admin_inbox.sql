-- Админка, этап «Обращения»: общий почтовый ящик (поддержка, претензии, споры, Legit-Check, отзывы, видео, перепродажа).
-- Все функции: security definer, search_path = public, первая строка — admin_require. Деньги — только wallet_move с уникальным source.
-- Откат: supabase/rollback/20261031210000_admin_inbox_rollback.sql

-- ── 1. Новый вид уведомления клиенту: ответ/решение по обращению ──
-- Бот (client_notifications.py) должен научиться kind = 'inbox_update' (MAX_AGE + build_message); пока не научится — строки просто стареют и пропускаются.
alter table public.notification_queue drop constraint if exists notification_queue_kind_check;
alter table public.notification_queue add constraint notification_queue_kind_check
  check (kind = any (array['order_status','promotion','news','currency','security','kyc_status','inbox_update']));

-- Внутренний помощник: поставить уведомление в очередь (дубль по ключу молча игнорируется). Снаружи не вызывается.
create or replace function public._inbox_notify(p_user bigint, p_section text, p_status text, p_text text, p_ref text, p_dedupe text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then
    return;
  end if;
  insert into public.notification_queue (user_id, kind, payload, dedupe_key)
  values (p_user, 'inbox_update',
          jsonb_build_object('section', p_section, 'status', p_status, 'text', left(coalesce(p_text, ''), 1000), 'ref', p_ref),
          p_dedupe)
  on conflict (dedupe_key) do nothing;
end $$;
revoke all on function public._inbox_notify(bigint, text, text, text, text, text) from public, anon, authenticated;

-- ── 2. Плашки: сколько ждёт решения по каждому разделу ──
create or replace function public.admin_inbox_counts() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_support integer; v_claims integer; v_disputes integer; v_legit integer; v_reviews integer; v_ugc integer; v_resale integer;
begin
  perform public.admin_require('admin');
  select count(*) into v_support from public.support_tickets where unread_by_operator and coalesce(status, '') <> 'closed';
  select count(*) into v_claims from public.insurance_claims where coalesce(status, 'pending') = 'pending';
  select count(*) into v_disputes from public.arbitration_tickets where coalesce(status, 'open') not in ('resolved', 'closed', 'rejected');
  select count(*) into v_legit from public.legit_check_requests where coalesce(status, 'pending') = 'pending';
  select count(*) into v_reviews from public.reviews
   where coalesce(moderation_status, case when is_published then 'approved' else 'pending' end) = 'pending';
  select count(*) into v_ugc from public.ugc_videos where coalesce(status, 'pending') = 'pending';
  select count(*) into v_resale from public.resale_items where coalesce(status, 'pending') = 'pending';
  return jsonb_build_object('support', v_support, 'claims', v_claims, 'disputes', v_disputes, 'legit', v_legit,
                            'reviews', v_reviews, 'ugc', v_ugc, 'resale', v_resale,
                            'total', v_support + v_claims + v_disputes + v_legit + v_reviews + v_ugc + v_resale);
end $$;

-- ── 3. Список обращений одного раздела ──
-- p_kind: support | claims | disputes | legit | reviews | ugc | resale
-- p_status: pending (ждёт, по умолчанию) | done (обработано) | all. Сначала ждущие, самые старые выше.
-- Ответ: {rows:[…], total:N (под фильтром), counts:{pending:N, done:N}}
create or replace function public.admin_inbox_list(p_kind text, p_status text default 'pending', p_limit integer default 20, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_status text := lower(trim(coalesce(p_status, 'pending')));
  v_limit integer := greatest(least(coalesce(p_limit, 20), 50), 1);
  v_off integer := greatest(coalesce(p_offset, 0), 0);
  v_base text;
  v_rows jsonb;
  v_total integer;
  v_counts jsonb;
begin
  perform public.admin_require('admin');
  if v_status not in ('pending', 'done', 'all') then
    raise exception 'Неизвестный фильтр статуса';
  end if;

  if v_kind = 'support' then
    v_base := $b$
      select t.id::text as id, coalesce(t.waiting_since, t.last_message_at, t.created_at) as ts,
             (t.unread_by_operator and coalesce(t.status, '') <> 'closed') as pend,
             jsonb_build_object('id', t.id, 'number', t.number, 'status', t.status, 'subject', t.subject,
               'last_message', left(t.last_message_text, 300), 'last_message_at', t.last_message_at, 'last_sender', t.last_sender,
               'order_id', t.order_id, 'source', t.source, 'created_at', t.created_at,
               'client', jsonb_build_object('user_id', t.user_id, 'name', coalesce(nullif(u.full_name, ''), nullif(t.user_name, ''), nullif(u.username, ''), t.user_id::text), 'username', coalesce(u.username, t.user_handle))) as item
        from public.support_tickets t left join public.users u on u.user_id = t.user_id $b$;
  elsif v_kind = 'claims' then
    v_base := $b$
      select c.id::text, c.created_at,
             coalesce(c.status, 'pending') = 'pending',
             jsonb_build_object('id', c.id, 'status', coalesce(c.status, 'pending'), 'description', left(c.description, 500),
               'rejection_reason', c.rejection_reason, 'order_id', c.order_id, 'created_at', c.created_at,
               'max_refund', (select greatest(coalesce(o.total_paid, 0) - coalesce(o.total_refunded, 0), 0) from public.orders o where o.id = c.order_id),
               'client', jsonb_build_object('user_id', c.user_id, 'name', coalesce(nullif(u.full_name, ''), nullif(u.username, ''), c.user_id::text), 'username', u.username))
        from public.insurance_claims c left join public.users u on u.user_id = c.user_id $b$;
  elsif v_kind = 'disputes' then
    v_base := $b$
      select t.id::text, t.created_at::timestamptz,
             coalesce(t.status, 'open') not in ('resolved', 'closed', 'rejected'),
             jsonb_build_object('id', t.id, 'status', coalesce(t.status, 'open'), 'subject', t.subject, 'description', left(t.description, 500),
               'priority', t.priority, 'order_id', t.order_id, 'resolution', t.resolution, 'created_at', t.created_at,
               'escalation_deadline', t.escalation_deadline, 'resolved_at', t.resolved_at,
               'max_refund', (select greatest(coalesce(o.total_paid, 0) - coalesce(o.total_refunded, 0), 0) from public.orders o where o.id = t.order_id),
               'messages_count', (select count(*) from public.ticket_messages m where m.ticket_id = t.id),
               'client', jsonb_build_object('user_id', t.opened_by, 'name', coalesce(nullif(u.full_name, ''), nullif(u.username, ''), t.opened_by::text), 'username', u.username))
        from public.arbitration_tickets t left join public.users u on u.user_id = t.opened_by $b$;
  elsif v_kind = 'legit' then
    v_base := $b$
      select l.id::text, l.created_at,
             coalesce(l.status, 'pending') = 'pending',
             jsonb_build_object('id', l.id, 'status', coalesce(l.status, 'pending'), 'brand', l.brand, 'model', l.model,
               'photos', to_jsonb(l.photos), 'comments', l.comments, 'created_at', l.created_at,
               'paid', (select coalesce(sum(b.amount), 0) from public.balance_entries b where b.source_transaction_id = 'legit:' || l.id and b.direction = 'DEBIT'),
               'refunded', exists (select 1 from public.balance_entries b where b.source_transaction_id = 'legit_refund:' || l.id),
               'client', jsonb_build_object('user_id', l.user_id, 'name', coalesce(nullif(u.full_name, ''), nullif(u.username, ''), l.user_id::text), 'username', u.username))
        from public.legit_check_requests l left join public.users u on u.user_id = l.user_id $b$;
  elsif v_kind = 'reviews' then
    v_base := $b$
      select r.id::text, r.created_at::timestamptz,
             coalesce(r.moderation_status, case when r.is_published then 'approved' else 'pending' end) = 'pending',
             jsonb_build_object('id', r.id, 'status', coalesce(r.moderation_status, case when r.is_published then 'approved' else 'pending' end),
               'rating', r.rating, 'category', r.category, 'text', left(r.text, 1000), 'media_urls', r.media_urls,
               'media_count', case when jsonb_typeof(r.media_urls) = 'array' then jsonb_array_length(r.media_urls) else 0 end,
               'order_id', r.order_id, 'bonus_given', r.bonus_given, 'moderation_reason', r.moderation_reason, 'created_at', r.created_at,
               'client', jsonb_build_object('user_id', r.user_id, 'name', coalesce(nullif(u.full_name, ''), nullif(r.user_name, ''), nullif(u.username, ''), r.user_id::text), 'username', u.username))
        from public.reviews r left join public.users u on u.user_id = r.user_id $b$;
  elsif v_kind = 'ugc' then
    v_base := $b$
      select v.id::text, v.created_at,
             coalesce(v.status, 'pending') = 'pending',
             jsonb_build_object('id', v.id, 'status', coalesce(v.status, 'pending'), 'video_url', v.video_url, 'caption', left(v.caption, 500),
               'reward_ices', v.reward_ices, 'reject_reason', v.reject_reason, 'order_id', v.order_id, 'created_at', v.created_at,
               'client', jsonb_build_object('user_id', v.user_id, 'name', coalesce(nullif(u.full_name, ''), nullif(u.username, ''), v.user_id::text), 'username', u.username))
        from public.ugc_videos v left join public.users u on u.user_id = v.user_id $b$;
  elsif v_kind = 'resale' then
    v_base := $b$
      select s.id::text, s.created_at,
             coalesce(s.status, 'pending') = 'pending',
             jsonb_build_object('id', s.id, 'status', coalesce(s.status, 'pending'), 'title', s.title, 'description', left(s.description, 500),
               'price_byn', s.price_byn, 'order_id', s.order_id, 'created_at', s.created_at,
               'client', jsonb_build_object('user_id', s.user_id, 'name', coalesce(nullif(u.full_name, ''), nullif(u.username, ''), s.user_id::text), 'username', u.username))
        from public.resale_items s left join public.users u on u.user_id = s.user_id $b$;
  else
    raise exception 'Неизвестный раздел обращений';
  end if;

  execute format($f$
    with b as (select * from (%s) q(id, ts, pend, item)),
         f as (select * from b where case $1 when 'pending' then pend when 'done' then not pend else true end),
         p as (select item, row_number() over (order by pend desc, case when pend then ts end asc, case when not pend then ts end desc, id) rn
                 from f order by rn limit $2 offset $3)
    select coalesce((select jsonb_agg(item order by rn) from p), '[]'::jsonb),
           (select count(*) from f)::integer,
           jsonb_build_object('pending', (select count(*) from b where pend), 'done', (select count(*) from b where not pend))
  $f$, v_base) into v_rows, v_total, v_counts using v_status, v_limit, v_off;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'counts', v_counts);
end $$;

-- ── 4. Карточка спора: сам спор + переписка ──
create or replace function public.admin_dispute_card(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  t public.arbitration_tickets;
  v_client jsonb;
  v_msgs jsonb;
  v_order jsonb;
begin
  perform public.admin_require('admin');
  select * into t from public.arbitration_tickets where id = p_id;
  if not found then
    raise exception 'Спор не найден';
  end if;
  select jsonb_build_object('user_id', t.opened_by, 'name', coalesce(nullif(u.full_name, ''), nullif(u.username, ''), t.opened_by::text), 'username', u.username)
    into v_client from (select 1) x left join public.users u on u.user_id = t.opened_by;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'sender_id', m.sender_id, 'is_client', (m.sender_id = t.opened_by),
           'name', coalesce(nullif(su.full_name, ''), nullif(su.username, ''), m.sender_id::text), 'text', m.text, 'created_at', m.created_at)
           order by m.created_at, m.id), '[]'::jsonb)
    into v_msgs from public.ticket_messages m left join public.users su on su.user_id = m.sender_id where m.ticket_id = t.id;
  select jsonb_build_object('id', o.id, 'total_paid', coalesce(o.total_paid, 0), 'total_refunded', coalesce(o.total_refunded, 0),
           'max_refund', greatest(coalesce(o.total_paid, 0) - coalesce(o.total_refunded, 0), 0))
    into v_order from public.orders o where o.id = t.order_id;
  return jsonb_build_object('id', t.id, 'status', coalesce(t.status, 'open'), 'subject', t.subject, 'description', t.description,
           'priority', t.priority, 'resolution', t.resolution, 'created_at', t.created_at, 'resolved_at', t.resolved_at,
           'escalation_deadline', t.escalation_deadline, 'assigned_to', t.assigned_to,
           'finished', coalesce(t.status, 'open') in ('resolved', 'closed', 'rejected'),
           'client', v_client, 'order', v_order, 'messages', v_msgs);
end $$;

-- ── 5. Ответ клиенту в споре ──
create or replace function public.admin_dispute_reply(p_id uuid, p_text text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  t public.arbitration_tickets;
  v_text text := trim(coalesce(p_text, ''));
  v_msg uuid;
begin
  if length(v_text) < 1 or length(v_text) > 2000 then
    raise exception 'Сообщение: от 1 до 2000 символов';
  end if;
  select * into t from public.arbitration_tickets where id = p_id for update;
  if not found then
    raise exception 'Спор не найден';
  end if;
  if coalesce(t.status, 'open') in ('resolved', 'closed', 'rejected') then
    raise exception 'Спор уже закрыт';
  end if;
  insert into public.ticket_messages (ticket_id, sender_id, text) values (t.id, v_me, v_text) returning id into v_msg;
  update public.arbitration_tickets
     set status = case when coalesce(status, 'open') = 'open' then 'in_progress' else status end,
         assigned_to = coalesce(assigned_to, v_me), updated_at = now() at time zone 'utc'
   where id = t.id;
  perform public._inbox_notify(t.opened_by, 'dispute', 'reply', v_text, t.id::text, 'inbox:dispute_reply:' || v_msg);
  perform public.admin_log('dispute_reply', 'dispute', t.id::text, jsonb_build_object('message_id', v_msg));
  return jsonb_build_object('ok', true, 'message_id', v_msg);
end $$;

-- ── 6. Решение по спору ──
-- p_decision: take (взять в работу) | refund (удовлетворить, при p_refund > 0 — вернуть деньги на баланс) | reject (отказать)
-- Для refund/reject комментарий обязателен (клиент его увидит). Сумма не больше «оплачено − уже возвращено» по заказу.
create or replace function public.admin_dispute_decision(p_id uuid, p_decision text, p_comment text default null, p_refund numeric default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  t public.arbitration_tickets;
  v_dec text := lower(trim(coalesce(p_decision, '')));
  v_comment text := trim(coalesce(p_comment, ''));
  v_refund numeric := round(coalesce(p_refund, 0), 2);
  v_max numeric;
  v_status text;
begin
  if v_dec not in ('take', 'refund', 'reject') then
    raise exception 'Неизвестное решение';
  end if;
  select * into t from public.arbitration_tickets where id = p_id for update;
  if not found then
    raise exception 'Спор не найден';
  end if;
  if coalesce(t.status, 'open') in ('resolved', 'closed', 'rejected') then
    raise exception 'Спор уже закрыт';
  end if;

  if v_dec = 'take' then
    if coalesce(t.status, 'open') = 'in_progress' then
      raise exception 'Спор уже в работе';
    end if;
    update public.arbitration_tickets set status = 'in_progress', assigned_to = v_me, updated_at = now() at time zone 'utc' where id = t.id;
    perform public.admin_log('dispute_take', 'dispute', t.id::text, '{}'::jsonb);
    return jsonb_build_object('ok', true, 'status', 'in_progress', 'refunded', 0);
  end if;

  if length(v_comment) < 3 then
    raise exception 'Напишите комментарий для клиента';
  end if;
  if p_refund is not null and v_dec = 'reject' then
    raise exception 'Сумма указывается только при удовлетворении спора';
  end if;
  if p_refund is not null and v_refund <= 0 then
    raise exception 'Сумма возврата должна быть больше нуля';
  end if;

  if v_dec = 'refund' and v_refund > 0 then
    if t.order_id is null then
      raise exception 'У спора нет заказа — вернуть деньги нельзя';
    end if;
    select greatest(coalesce(total_paid, 0) - coalesce(total_refunded, 0), 0) into v_max from public.orders where id = t.order_id for update;
    if v_refund > coalesce(v_max, 0) then
      raise exception 'Сумма больше, чем можно вернуть по заказу (%)', coalesce(v_max, 0);
    end if;
    perform public.wallet_move(t.opened_by, v_refund, 'CREDIT', 'DISPUTE_REFUND', 'REFUND', t.order_id, null, 'dispute:' || t.id);
    insert into public.refunds (order_id, user_id, amount, destination, status, reason, created_by, completed_at)
    values (t.order_id, t.opened_by, v_refund, 'BALANCE', 'COMPLETED', 'Спор', v_me, now());
    update public.orders set total_refunded = coalesce(total_refunded, 0) + v_refund, updated_at = now() where id = t.order_id;
    perform public.order_event(t.order_id, 'DISPUTE_REFUND', 'OPERATOR', jsonb_build_object('amount', v_refund, 'dispute_id', t.id), null);
  else
    v_refund := 0;
  end if;

  v_status := case when v_dec = 'refund' then 'resolved' else 'rejected' end;
  update public.arbitration_tickets
     set status = v_status, resolution = left(v_comment, 2000), assigned_to = coalesce(assigned_to, v_me),
         resolved_at = now() at time zone 'utc', updated_at = now() at time zone 'utc'
   where id = t.id;
  perform public._inbox_notify(t.opened_by, 'dispute', v_status,
    v_comment || case when v_refund > 0 then E'\nВозврат на баланс: ' || v_refund else '' end, t.id::text, 'inbox:dispute:' || t.id);
  perform public.admin_log('dispute_' || v_dec, 'dispute', t.id::text, jsonb_build_object('refund', v_refund, 'comment', v_comment, 'order_id', t.order_id));
  return jsonb_build_object('ok', true, 'status', v_status, 'refunded', v_refund);
end $$;

-- ── 7. Вердикт Legit-Check ──
-- p_verdict: original | fake | impossible (определить нельзя — оплата 5 ₽ возвращается на баланс). Комментарий обязателен.
create or replace function public.admin_legit_verdict(p_id uuid, p_verdict text, p_comment text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  l public.legit_check_requests;
  v_v text := lower(trim(coalesce(p_verdict, '')));
  v_comment text := trim(coalesce(p_comment, ''));
  v_paid numeric;
  v_refund numeric := 0;
begin
  if v_v not in ('original', 'fake', 'impossible') then
    raise exception 'Вердикт: original, fake или impossible';
  end if;
  if length(v_comment) < 3 then
    raise exception 'Напишите комментарий для клиента';
  end if;
  select * into l from public.legit_check_requests where id = p_id for update;
  if not found then
    raise exception 'Заявка не найдена';
  end if;
  if coalesce(l.status, 'pending') <> 'pending' then
    raise exception 'Заявка уже проверена';
  end if;
  if v_v = 'impossible' then
    select coalesce(sum(amount), 0) into v_paid from public.balance_entries where source_transaction_id = 'legit:' || l.id and direction = 'DEBIT';
    if v_paid > 0 then
      perform public.wallet_move(l.user_id, v_paid, 'CREDIT', 'LEGIT_REFUND', 'REFUND', null, null, 'legit_refund:' || l.id);
      v_refund := v_paid;
    end if;
  end if;
  update public.legit_check_requests set status = v_v, comments = left(v_comment, 2000) where id = l.id;
  perform public._inbox_notify(l.user_id, 'legit', v_v,
    v_comment || case when v_refund > 0 then E'\nОплата возвращена на баланс: ' || v_refund else '' end, l.id::text, 'inbox:legit:' || l.id);
  perform public.admin_log('legit_' || v_v, 'legit', l.id::text, jsonb_build_object('refund', v_refund, 'comment', v_comment));
  return jsonb_build_object('ok', true, 'status', v_v, 'refunded', v_refund);
end $$;

-- ── 8. Перепродажа: одобрить или отклонить ──
create or replace function public.admin_resale_decision(p_id uuid, p_approve boolean, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  s public.resale_items;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  select * into s from public.resale_items where id = p_id for update;
  if not found then
    raise exception 'Объявление не найдено';
  end if;
  if coalesce(s.status, 'pending') <> 'pending' then
    raise exception 'Объявление уже рассмотрено';
  end if;
  if not coalesce(p_approve, false) and length(v_reason) < 3 then
    raise exception 'Укажите причину отказа';
  end if;
  update public.resale_items set status = case when p_approve then 'approved' else 'rejected' end where id = s.id;
  perform public._inbox_notify(s.user_id, 'resale', case when p_approve then 'approved' else 'rejected' end,
    case when p_approve then 'Объявление «' || left(s.title, 100) || '» одобрено' else 'Объявление «' || left(s.title, 100) || '» отклонено: ' || v_reason end,
    s.id::text, 'inbox:resale:' || s.id);
  perform public.admin_log(case when p_approve then 'resale_approve' else 'resale_reject' end, 'resale', s.id::text,
                           jsonb_build_object('reason', nullif(v_reason, ''), 'title', s.title));
  return jsonb_build_object('ok', true, 'status', case when p_approve then 'approved' else 'rejected' end);
end $$;

-- ── 9. Права: только вошедшие пользователи, внутри — admin_require ──
revoke all on function public.admin_inbox_counts() from public, anon;
revoke all on function public.admin_inbox_list(text, text, integer, integer) from public, anon;
revoke all on function public.admin_dispute_card(uuid) from public, anon;
revoke all on function public.admin_dispute_reply(uuid, text) from public, anon;
revoke all on function public.admin_dispute_decision(uuid, text, text, numeric) from public, anon;
revoke all on function public.admin_legit_verdict(uuid, text, text) from public, anon;
revoke all on function public.admin_resale_decision(uuid, boolean, text) from public, anon;
grant execute on function public.admin_inbox_counts() to authenticated;
grant execute on function public.admin_inbox_list(text, text, integer, integer) to authenticated;
grant execute on function public.admin_dispute_card(uuid) to authenticated;
grant execute on function public.admin_dispute_reply(uuid, text) to authenticated;
grant execute on function public.admin_dispute_decision(uuid, text, text, numeric) to authenticated;
grant execute on function public.admin_legit_verdict(uuid, text, text) to authenticated;
grant execute on function public.admin_resale_decision(uuid, boolean, text) to authenticated;
