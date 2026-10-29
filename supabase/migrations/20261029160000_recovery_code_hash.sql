-- Ключ восстановления аккаунта: храним только отпечаток SHA-256, сам ключ видит лишь владелец в момент создания.
-- Проверяет бот в /recover (ICE LOGIX BOT/main.py).
alter table public.users add column if not exists recovery_code_hash text;
comment on column public.users.recovery_code_hash is 'SHA-256 ключа восстановления (сам ключ не хранится). Проверяет бот в /recover';
create index if not exists users_recovery_code_hash_idx on public.users (recovery_code_hash) where recovery_code_hash is not null;
