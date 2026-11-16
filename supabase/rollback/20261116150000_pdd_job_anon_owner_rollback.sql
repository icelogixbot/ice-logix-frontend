-- Откат 20261116150000_pdd_job_anon_owner: владелец подменяется на app_uid() только если он не пуст.
CREATE OR REPLACE FUNCTION public.pdd_job_create(p_kind text, p_input jsonb, p_user_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_job      public.pdd_jobs;
  v_cached   public.pdd_jobs;
  v_key      text;
  v_active   int;
  v_uid      bigint;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.app_phone_ok() THEN RAISE EXCEPTION 'phone_required'; END IF;

  -- Владелец задачи — тот, кто вошёл, а не то, что прислал клиент
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    v_uid := public.app_uid();
    if v_uid is not null then
      p_user_id := v_uid;
    end if;
  end if;

  if p_kind not in ('product', 'search_image', 'search_text') then
    raise exception 'unknown kind';
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object' or length(p_input::text) > 4000 then
    raise exception 'bad input';
  end if;

  -- Устаревшие незавершённые задачи клиент уже не ждёт: закрываем
  update public.pdd_jobs
     set status = 'cancelled', updated_at = now(), finished_at = now()
   where status in ('queued', 'processing', 'partial')
     and created_at < now() - interval '10 minutes';

  -- Не больше 3 свежих активных задач на пользователя
  if p_user_id is not null then
    select count(*) into v_active from public.pdd_jobs
     where user_id = p_user_id and status in ('queued', 'processing', 'partial')
       and created_at >= now() - interval '10 minutes';
    if v_active >= 3 then
      raise exception 'too many active jobs';
    end if;
  end if;

  -- Кэш карточки товара: тот же goods_id за последние 6 часов отдаём сразу
  v_key := nullif(p_input->>'goods_id', '');
  if p_kind = 'product' and v_key is not null then
    select * into v_cached from public.pdd_jobs
     where kind = 'product' and cache_key = v_key and status = 'done'
       and finished_at > now() - interval '6 hours'
     order by finished_at desc limit 1;
  end if;

  insert into public.pdd_jobs (user_id, kind, input, cache_key, status, result, progress, finished_at)
  values (
    p_user_id, p_kind, p_input, v_key,
    case when v_cached.id is not null then 'done' else 'queued' end,
    v_cached.result,
    case when v_cached.id is not null then jsonb_build_object('step', 'cache', 'label', 'Готово', 'pct', 100) else '{}'::jsonb end,
    case when v_cached.id is not null then now() else null end
  )
  returning * into v_job;

  return jsonb_build_object('id', v_job.id, 'token', v_job.client_token, 'status', v_job.status, 'cached', v_cached.id is not null);
end;
$function$;
