-- Админская группа с темами (ADR-012). База кладёт события в admin_events, бот (ICE LOGIX BOT/admin_group.py)
-- отправляет их в нужную тему группы. Обе таблицы закрыты от публичного ключа: только бот с секретным ключом.

-- Где какая тема: заполняет бот командой /setup в группе
create table if not exists public.admin_topics (
  key text primary key check (key in ('orders', 'kyc', 'alerts', 'backups', 'broadcast', 'disputes')),
  chat_id bigint not null,
  thread_id integer not null,
  title text not null,
  updated_at timestamptz not null default now()
);
comment on table public.admin_topics is 'Темы админской группы Telegram (chat_id, thread_id). Заполняет бот по /setup. Только секретный ключ.';
alter table public.admin_topics enable row level security;
revoke all on public.admin_topics from anon, authenticated;

create table if not exists public.admin_events (
  id bigserial primary key,
  topic text not null check (topic in ('orders', 'kyc', 'alerts', 'backups', 'broadcast', 'disputes')),
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'skipped', 'failed')),
  attempts integer not null default 0,
  not_before timestamptz not null default now(),
  dedupe_key text unique,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
comment on table public.admin_events is 'Очередь событий для админской группы: заказы, паспорта, тревоги, бэкапы, споры. Только секретный ключ.';
create index if not exists admin_events_due_idx on public.admin_events (not_before) where status = 'queued';
alter table public.admin_events enable row level security;
revoke all on public.admin_events from anon, authenticated;
revoke all on sequence public.admin_events_id_seq from anon, authenticated;

-- Заказы: новый заказ, смена статуса (через минуту, бот проверит, что статус ещё текущий), вес больше расчётного
create or replace function public.admin_event_orders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := coalesce(nullif(new.title_translated, ''), nullif(new.title, ''), nullif(new.title_original, ''));
begin
  if tg_op = 'INSERT' then
    insert into public.admin_events (topic, kind, payload)
    values ('orders', 'order_new', jsonb_build_object(
      'order_id', new.id, 'user_id', new.user_id, 'title', v_title, 'status', new.status,
      'total', coalesce(new.total_byn, new.total_final, new.price_byn),
      'delivery_method', new.delivery_method, 'payment_method', new.payment_method));
    return new;
  end if;

  if new.status is distinct from old.status and new.status is not null and new.status <> 'deleted' then
    insert into public.admin_events (topic, kind, payload, not_before)
    values ('orders', 'order_status', jsonb_build_object(
      'order_id', new.id, 'user_id', new.user_id, 'title', v_title, 'status', new.status, 'old_status', old.status),
      now() + interval '1 minute');
  end if;

  if new.weight_actual is distinct from old.weight_actual
     and coalesce(new.weight_estimated, 0) > 0 and new.weight_actual is not null
     and new.weight_actual - new.weight_estimated > greatest(0.3, new.weight_estimated * 0.2) then
    insert into public.admin_events (topic, kind, payload, dedupe_key)
    values ('alerts', 'weight', jsonb_build_object(
      'order_id', new.id, 'user_id', new.user_id, 'title', v_title,
      'estimated', new.weight_estimated, 'actual', new.weight_actual),
      'weight:' || new.id || ':' || new.weight_actual)
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_admin_event on public.orders;
create trigger trg_orders_admin_event
  after insert or update of status, weight_actual on public.orders
  for each row execute function public.admin_event_orders();

-- Паспорта: новая заявка или повторная подача (статус снова pending)
create or replace function public.admin_event_kyc()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    insert into public.admin_events (topic, kind, payload)
    values ('kyc', 'kyc_new', jsonb_build_object('kyc_id', new.id, 'user_id', new.user_id));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_kyc_admin_event on public.kyc_verifications;
create trigger trg_kyc_admin_event
  after insert or update of status on public.kyc_verifications
  for each row execute function public.admin_event_kyc();

-- Споры: новый тикет
create or replace function public.admin_event_dispute()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_events (topic, kind, payload)
  values ('disputes', 'dispute_new', jsonb_build_object(
    'ticket_id', new.id, 'order_id', new.order_id, 'user_id', new.opened_by,
    'subject', new.subject, 'description', left(coalesce(new.description, ''), 800), 'priority', new.priority));
  return new;
end;
$$;

drop trigger if exists trg_dispute_admin_event on public.arbitration_tickets;
create trigger trg_dispute_admin_event
  after insert on public.arbitration_tickets
  for each row execute function public.admin_event_dispute();

-- Пауза и возобновление приёма оплат
create or replace function public.admin_event_payments_pause()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_payments_paused is distinct from old.is_payments_paused then
    insert into public.admin_events (topic, kind, payload)
    values ('alerts', 'payments_paused', jsonb_build_object('paused', coalesce(new.is_payments_paused, false), 'reason', new.pause_reason));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payments_pause_admin_event on public.app_settings;
create trigger trg_payments_pause_admin_event
  after update of is_payments_paused on public.app_settings
  for each row execute function public.admin_event_payments_pause();

revoke execute on function public.admin_event_orders() from public, anon, authenticated;
revoke execute on function public.admin_event_kyc() from public, anon, authenticated;
revoke execute on function public.admin_event_dispute() from public, anon, authenticated;
revoke execute on function public.admin_event_payments_pause() from public, anon, authenticated;

-- Новость клиентам из темы «Рассылки»: в клиентскую очередь всем, кто не отключил новости.
-- p_dry_run = true — только посчитать получателей. Повтор с тем же p_key ничего не добавит.
create or replace function public.enqueue_news(p_title text, p_text text, p_key text, p_dry_run boolean default false)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if coalesce(trim(p_text), '') = '' then
    return 0;
  end if;
  if p_dry_run then
    select count(*) into v_count
    from public.users u
    where u.user_id is not null
      and coalesce(u.is_banned, false) = false
      and coalesce(u.notification_settings ->> 'news', 'true') <> 'false';
    return v_count;
  end if;

  insert into public.notification_queue (user_id, kind, payload, dedupe_key)
  select u.user_id, 'news', jsonb_build_object('title', p_title, 'text', p_text), 'news:' || p_key || ':' || u.user_id
  from public.users u
  where u.user_id is not null
    and coalesce(u.is_banned, false) = false
    and coalesce(u.notification_settings ->> 'news', 'true') <> 'false'
  on conflict (dedupe_key) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.enqueue_news(text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.enqueue_news(text, text, text, boolean) to service_role;
