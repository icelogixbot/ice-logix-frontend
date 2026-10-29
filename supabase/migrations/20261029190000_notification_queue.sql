-- Уведомления клиентам через бота (этап 2 настроек).
-- База кладёт сообщение в очередь, бот (ICE LOGIX BOT/client_notifications.py) раз в 20 секунд
-- забирает его и отправляет с учётом подписок и тихих часов. Очередь закрыта от публичного ключа:
-- читать и писать её может только бот с секретным ключом и функции ниже.

create table if not exists public.notification_queue (
  id bigserial primary key,
  user_id bigint not null,
  kind text not null check (kind in ('order_status', 'promotion', 'news', 'currency')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'skipped', 'failed')),
  attempts integer not null default 0,
  not_before timestamptz not null default now(),
  dedupe_key text unique,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

comment on table public.notification_queue is 'Очередь сообщений клиентам от бота: статусы заказов, акции, новости, сигнал курса юаня. Только секретный ключ.';

create index if not exists notification_queue_due_idx on public.notification_queue (not_before) where status = 'queued';

alter table public.notification_queue enable row level security;
revoke all on public.notification_queue from anon, authenticated;
revoke all on sequence public.notification_queue_id_seq from anon, authenticated;

-- Смена статуса заказа → сообщение клиенту. Отправка через минуту: если админ ошибся и сразу
-- поменял статус ещё раз, бот увидит, что статус уже другой, и старое сообщение не отправит.
create or replace function public.enqueue_order_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null or new.status is null or new.status = 'deleted' then
    return new;
  end if;
  insert into public.notification_queue (user_id, kind, payload, not_before)
  values (
    new.user_id,
    'order_status',
    jsonb_build_object(
      'order_id', new.id,
      'status', new.status,
      'old_status', old.status,
      'title', coalesce(nullif(new.title_translated, ''), nullif(new.title, ''), nullif(new.title_original, '')),
      'tracking', coalesce(nullif(new.tracking_number_by, ''), nullif(new.tracking_number_intl, ''))
    ),
    now() + interval '1 minute'
  );
  return new;
end;
$$;

drop trigger if exists trg_orders_status_notification on public.orders;
create trigger trg_orders_status_notification
  after update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.enqueue_order_status_notification();

revoke execute on function public.enqueue_order_status_notification() from public, anon, authenticated;

-- Пуш акции: одно сообщение каждому, кто не отключил «Акции», и пометка push_sent.
-- dedupe_key не даёт отправить одну акцию одному человеку дважды.
create or replace function public.enqueue_promotion_push(p_promotion_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo public.promotions%rowtype;
  v_count integer := 0;
begin
  select * into v_promo from public.promotions where id = p_promotion_id for update;
  if not found or v_promo.push_sent or coalesce(v_promo.push_text, '') = '' then
    return 0;
  end if;

  insert into public.notification_queue (user_id, kind, payload, dedupe_key)
  select u.user_id,
         'promotion',
         jsonb_build_object('promotion_id', v_promo.id, 'title', v_promo.title, 'text', v_promo.push_text),
         'promotion:' || v_promo.id || ':' || u.user_id
  from public.users u
  where u.user_id is not null
    and coalesce(u.is_banned, false) = false
    and coalesce(u.notification_settings ->> 'promotions', 'true') <> 'false'
  on conflict (dedupe_key) do nothing;
  get diagnostics v_count = row_count;

  update public.promotions set push_sent = true where id = v_promo.id;
  return v_count;
end;
$$;

revoke execute on function public.enqueue_promotion_push(uuid) from public, anon, authenticated;
grant execute on function public.enqueue_promotion_push(uuid) to service_role;

-- Сигнал по курсу юаня: атомарно гасит сигнал клиента (users.settings.currency_alerts[id])
-- и кладёт сообщение в очередь. Повторный вызов для того же сигнала ничего не делает.
create or replace function public.fire_currency_alert(p_user_id bigint, p_alert_id text, p_rate numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alerts jsonb;
  v_alert jsonb;
begin
  select settings -> 'currency_alerts' into v_alerts from public.users where user_id = p_user_id for update;
  if v_alerts is null or jsonb_typeof(v_alerts) <> 'array' then
    return false;
  end if;

  select a into v_alert
  from jsonb_array_elements(v_alerts) a
  where a ->> 'id' = p_alert_id and coalesce((a ->> 'active')::boolean, true)
  limit 1;
  if v_alert is null then
    return false;
  end if;

  update public.users
  set settings = jsonb_set(settings, '{currency_alerts}', (
    select coalesce(jsonb_agg(
      case when a ->> 'id' = p_alert_id
        then a || jsonb_build_object('active', false, 'fired_at', now(), 'fired_rate', p_rate)
        else a end
      order by ord), '[]'::jsonb)
    from jsonb_array_elements(v_alerts) with ordinality t(a, ord)
  ))
  where user_id = p_user_id;

  insert into public.notification_queue (user_id, kind, payload, dedupe_key)
  values (
    p_user_id,
    'currency',
    jsonb_build_object('currency', coalesce(v_alert ->> 'currency', 'CNY'), 'target', v_alert -> 'target', 'rate', p_rate),
    'currency:' || p_user_id || ':' || p_alert_id
  )
  on conflict (dedupe_key) do nothing;
  return true;
end;
$$;

revoke execute on function public.fire_currency_alert(bigint, text, numeric) from public, anon, authenticated;
grant execute on function public.fire_currency_alert(bigint, text, numeric) to service_role;
