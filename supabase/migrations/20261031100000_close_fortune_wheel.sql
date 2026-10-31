-- Колесо удачи закрыто, пока не продумана механика (решение владельца 2026-10-31).
-- Сервер больше не крутит колесо и не выпускает промокоды. Скидки создаются только в админке.
-- Откат: supabase/rollback/20261031100000_close_fortune_wheel_rollback.sql

create or replace function public.spin_fortune_wheel()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.app_require_uid();
  raise exception 'Колесо удачи пока закрыто' using errcode = 'P0001';
end $function$;

-- Коды, которые выпустило колесо (ICE5-…, ICE10-…). Других действующих кодов нет.
update public.promocodes
   set is_active = false
 where id in ('dfa5eef3-892a-411a-9dce-90061eb7a2fc', 'ae32afa8-eb37-44ed-babd-50b54fd2e500');

-- Неиспользованные купоны «бесплатная доставка» с колеса
update public.users
   set settings = jsonb_set(settings, '{free_delivery_tokens}', '0'::jsonb)
 where coalesce((settings ->> 'free_delivery_tokens')::int, 0) > 0;
