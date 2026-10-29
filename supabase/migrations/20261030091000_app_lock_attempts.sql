-- Счётчики попыток код-пароля атомарно, до сравнения кода: даже параллельные запросы не дают больше 5 проверок.
-- Вызывает только функция app-lock (секретный ключ).

-- Забрать попытку: p_kind = 'pin' (ввод кода) или 'reset' (ввод кода сброса). Возвращает номер попытки, -1 если записи нет.
create or replace function public.app_lock_take_attempt(p_auth uuid, p_kind text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v integer;
begin
  if p_kind = 'reset' then
    update public.app_locks set reset_attempts = reset_attempts + 1, updated_at = now()
    where auth_id = p_auth returning reset_attempts into v;
  else
    update public.app_locks set failed_attempts = failed_attempts + 1, updated_at = now()
    where auth_id = p_auth returning failed_attempts into v;
  end if;
  return coalesce(v, -1);
end;
$$;

-- Запрос кода сброса: сколько запросов уже было за последний час (включая этот)
create or replace function public.app_lock_take_reset_request(p_auth uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v integer;
begin
  update public.app_locks
  set reset_requests = case when reset_window_start is null or reset_window_start < now() - interval '1 hour' then 1 else reset_requests + 1 end,
      reset_window_start = case when reset_window_start is null or reset_window_start < now() - interval '1 hour' then now() else reset_window_start end,
      updated_at = now()
  where auth_id = p_auth
  returning reset_requests into v;
  return coalesce(v, -1);
end;
$$;

revoke execute on function public.app_lock_take_attempt(uuid, text) from public, anon, authenticated;
revoke execute on function public.app_lock_take_reset_request(uuid) from public, anon, authenticated;
grant execute on function public.app_lock_take_attempt(uuid, text) to service_role;
grant execute on function public.app_lock_take_reset_request(uuid) to service_role;
