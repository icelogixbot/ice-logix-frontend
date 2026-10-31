-- Админка, «Система»: состояние фоновых служб одним запросом (только чтение, только владелец).
-- Таблицы воркеров, очередей и событий закрыты RLS без политик, поэтому читаем через функцию.
-- Откат: supabase/rollback/20261101150000_admin_system_rollback.sql

create or replace function public.admin_system_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_require('owner');
  return jsonb_build_object(
    'workers', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'last_seen', w.last_seen, 'info', w.info) order by w.last_seen desc)
      from public.pdd_workers w), '[]'::jsonb),
    'jobs', jsonb_build_object(
      'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.pdd_jobs group by status) s), '{}'::jsonb),
      'errors', coalesce((
        select jsonb_agg(jsonb_build_object('id', j.id, 'kind', j.kind, 'error', left(coalesce(j.error, ''), 300), 'at', coalesce(j.finished_at, j.updated_at)) order by coalesce(j.finished_at, j.updated_at) desc)
        from (select * from public.pdd_jobs where status = 'error' order by coalesce(finished_at, updated_at) desc limit 5) j), '[]'::jsonb)),
    'notifications', jsonb_build_object(
      'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.notification_queue group by status) s), '{}'::jsonb),
      'failed', coalesce((
        select jsonb_agg(jsonb_build_object('id', q.id, 'kind', q.kind, 'error', left(coalesce(q.error, ''), 300), 'attempts', q.attempts, 'at', q.created_at) order by q.created_at desc)
        from (select * from public.notification_queue where status = 'failed' order by created_at desc limit 5) q), '[]'::jsonb)),
    'events', jsonb_build_object(
      'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.admin_events group by status) s), '{}'::jsonb),
      'failed', coalesce((
        select jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'error', left(coalesce(e.error, ''), 300), 'attempts', e.attempts, 'at', e.created_at) order by e.created_at desc)
        from (select * from public.admin_events where status = 'failed' order by created_at desc limit 5) e), '[]'::jsonb))
  );
end $$;
revoke all on function public.admin_system_overview() from public, anon;
grant execute on function public.admin_system_overview() to authenticated;
