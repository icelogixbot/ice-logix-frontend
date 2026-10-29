-- Очередь задач для движка Pinduoduo (эмулятор на ноуте).
-- Три вида задач: товар по ссылке, поиск по фото, поиск по описанию.
-- Клиент НЕ имеет прямого доступа к таблице: только функции pdd_job_create / pdd_job_status.
-- Работник на ноуте ходит секретным ключом (обходит RLS).

create table if not exists public.pdd_jobs (
  id            bigserial primary key,
  client_token  uuid not null default gen_random_uuid(),
  user_id       bigint,
  kind          text not null check (kind in ('product', 'search_image', 'search_text')),
  status        text not null default 'queued'
                check (status in ('queued', 'processing', 'partial', 'done', 'error', 'cancelled')),
  input         jsonb not null default '{}'::jsonb,
  progress      jsonb not null default '{}'::jsonb,
  result        jsonb,
  error         text,
  cache_key     text,
  attempts      int not null default 0,
  worker_id     text,
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz,
  updated_at    timestamptz not null default now()
);

create index if not exists pdd_jobs_queue_idx on public.pdd_jobs (status, id) where status in ('queued', 'processing');
create index if not exists pdd_jobs_cache_idx on public.pdd_jobs (kind, cache_key, finished_at desc) where status = 'done';
create index if not exists pdd_jobs_user_idx on public.pdd_jobs (user_id, created_at desc);

alter table public.pdd_jobs enable row level security;
-- Политик нет намеренно: anon/authenticated доступа к таблице не имеют.

-- Отметка «работник на связи»: ноут пишет сюда раз в 15 секунд.
create table if not exists public.pdd_workers (
  id         text primary key,
  last_seen  timestamptz not null default now(),
  info       jsonb not null default '{}'::jsonb
);
alter table public.pdd_workers enable row level security;

-- ── Клиент: создать задачу ──────────────────────────────────────────────────
create or replace function public.pdd_job_create(p_kind text, p_input jsonb, p_user_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job      public.pdd_jobs;
  v_cached   public.pdd_jobs;
  v_key      text;
  v_active   int;
begin
  if p_kind not in ('product', 'search_image', 'search_text') then
    raise exception 'unknown kind';
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object' or length(p_input::text) > 4000 then
    raise exception 'bad input';
  end if;

  -- Не больше 3 активных задач на пользователя
  if p_user_id is not null then
    select count(*) into v_active from public.pdd_jobs
     where user_id = p_user_id and status in ('queued', 'processing', 'partial');
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
$$;

-- ── Клиент: узнать статус своей задачи (по id + секретному токену) ──────────
create or replace function public.pdd_job_status(p_id bigint, p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job       public.pdd_jobs;
  v_position  int;
  v_online    boolean;
begin
  select * into v_job from public.pdd_jobs where id = p_id and client_token = p_token;
  if v_job.id is null then
    return jsonb_build_object('ok', false, 'error', 'not found');
  end if;

  select count(*) into v_position from public.pdd_jobs
   where status in ('queued', 'processing') and id < v_job.id;

  select exists(select 1 from public.pdd_workers where last_seen > now() - interval '45 seconds') into v_online;

  return jsonb_build_object(
    'ok', true,
    'id', v_job.id,
    'kind', v_job.kind,
    'status', v_job.status,
    'progress', v_job.progress,
    'result', case when v_job.status in ('partial', 'done') then v_job.result else null end,
    'error', v_job.error,
    'queue_position', case when v_job.status = 'queued' then v_position else 0 end,
    'worker_online', v_online
  );
end;
$$;

-- ── Клиент: проверить, на связи ли ноут (до создания задачи) ────────────────
create or replace function public.pdd_worker_online()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.pdd_workers where last_seen > now() - interval '45 seconds');
$$;

-- ── Работник: забрать следующую задачу (по порядку, без гонок) ──────────────
create or replace function public.pdd_job_claim(p_worker text)
returns public.pdd_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.pdd_jobs;
begin
  -- Зависшие задачи (> 4 мин без обновления) возвращаем в очередь или закрываем ошибкой
  update public.pdd_jobs
     set status = case when attempts >= 2 then 'error' else 'queued' end,
         error  = case when attempts >= 2 then 'Эмулятор не справился с задачей за отведённое время' else error end,
         finished_at = case when attempts >= 2 then now() else null end,
         updated_at = now()
   where status = 'processing' and updated_at < now() - interval '4 minutes';

  -- Слишком старые задачи в очереди (> 15 мин) клиент уже не ждёт
  update public.pdd_jobs
     set status = 'cancelled', updated_at = now(), finished_at = now()
   where status = 'queued' and created_at < now() - interval '15 minutes';

  select * into v_job from public.pdd_jobs
   where status = 'queued'
   order by id
   limit 1
   for update skip locked;

  if v_job.id is null then
    return null;
  end if;

  update public.pdd_jobs
     set status = 'processing', worker_id = p_worker, attempts = attempts + 1,
         started_at = coalesce(started_at, now()), updated_at = now()
   where id = v_job.id
  returning * into v_job;

  return v_job;
end;
$$;

revoke all on function public.pdd_job_claim(text) from public, anon, authenticated;
grant execute on function public.pdd_job_claim(text) to service_role;
grant execute on function public.pdd_job_create(text, jsonb, bigint) to anon, authenticated;
grant execute on function public.pdd_job_status(bigint, uuid) to anon, authenticated;
grant execute on function public.pdd_worker_online() to anon, authenticated;
