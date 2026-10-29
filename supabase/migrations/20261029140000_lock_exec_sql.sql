-- Безопасность: exec_sql (SECURITY DEFINER, произвольный SELECT в обход RLS) была доступна
-- по публичному ключу. Оставляем вызов только серверу (service_role / секретный ключ).
-- Откат: grant execute on function public.exec_sql(text) to anon, authenticated;
revoke all on function public.exec_sql(text) from public, anon, authenticated;
grant execute on function public.exec_sql(text) to service_role;
