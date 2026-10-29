-- Код-пароль и вход по Face ID / отпечатку (этап 3 настроек, ADR-013).
-- Всё проверяет только функция app-lock с секретным ключом. Публичному ключу таблица закрыта полностью.
-- Привязка к учётной записи входа (auth.users.id из токена), а не к users.user_id: связь в users пока можно подменить.

create table if not exists public.app_locks (
  auth_id uuid primary key references auth.users (id) on delete cascade,
  user_id bigint,
  telegram_id bigint not null,          -- куда бот пришлёт код сброса; берётся из подписанных данных Telegram
  pin_hash text not null,               -- PBKDF2-SHA256(HMAC(пин, секрет сервера), соль)
  pin_salt text not null,
  pin_iter integer not null,
  failed_attempts integer not null default 0,
  blocked_at timestamptz,               -- 5 ошибок подряд: снимается только сбросом через бота
  bio_devices jsonb not null default '[]'::jsonb,  -- [{device_id, token_hash, type, added_at}]
  reset_code_hash text,
  reset_expires_at timestamptz,
  reset_attempts integer not null default 0,
  reset_window_start timestamptz,
  reset_requests integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.app_locks is 'Код-пароль приложения: только отпечатки (PIN, ключи биометрии, код сброса). Доступ только у функции app-lock.';

alter table public.app_locks enable row level security;
revoke all on public.app_locks from anon, authenticated;

-- Код сброса приходит от бота: новый вид сообщения в клиентской очереди
alter table public.notification_queue drop constraint if exists notification_queue_kind_check;
alter table public.notification_queue add constraint notification_queue_kind_check
  check (kind in ('order_status', 'promotion', 'news', 'currency', 'security'));
