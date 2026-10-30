-- Подчистка по аудиту Supabase (security advisors) после включения защиты таблиц.

-- Триггерные функции с правами владельца не должны быть видны в API (/rest/v1/rpc/...)
revoke all on function public.handle_new_user(), public.ledger_apply(), public.ledger_log_direct()
  from public, anon, authenticated;

-- Проверка доступа к заказу нужна только вошедшим (её вызывают правила доступа)
revoke all on function public.app_can_see_order(uuid) from public, anon;
grant execute on function public.app_can_see_order(uuid) to authenticated;

-- Фиксированная схема поиска: иначе функцию можно обмануть своей таблицей с тем же именем
alter function public.exec_sql(text) set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.increment_promotion_usage(uuid) set search_path = public;
alter function public.update_updated_at_column() set search_path = public;
alter function public.update_ticket_updated_at() set search_path = public;
alter function public.fn_create_review_action_on_delivery() set search_path = public;
alter function public.fn_sync_review_likes_count() set search_path = public;
