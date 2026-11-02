-- ============================================================
-- ICE LOGIX · Бот-модератор чатов и каналов (ice-logix-moderator)
-- Таблицы читает и пишет только бот (серверный ключ). Приложение работает через функции admin_mod_*
-- (роль owner/admin). Правила чата лежат в mod_chats.settings, значения по умолчанию — в коде бота.
-- ============================================================

-- ── 1. Чаты и каналы, где бот работает ──
create table if not exists public.mod_chats (
  chat_id bigint primary key,
  title text not null default '',
  username text,
  kind text not null default 'supergroup',        -- group | supergroup | channel
  linked_chat_id bigint,                          -- у канала — группа комментариев
  enabled boolean not null default true,
  bot_is_admin boolean not null default false,
  can_restrict boolean not null default false,    -- у бота есть право банить и ограничивать
  can_delete boolean not null default false,      -- у бота есть право удалять сообщения
  members integer,
  settings jsonb not null default '{}'::jsonb,    -- только то, что отличается от умолчаний
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 2. Журнал действий (удаления, предупреждения, муты, баны) ──
create table if not exists public.mod_actions (
  id bigint generated always as identity primary key,
  chat_id bigint not null,
  user_id bigint,
  user_name text,
  action text not null,        -- delete | warn | unwarn | mute | unmute | ban | unban | kick | captcha_fail | raid | gban
  rule text,                   -- какое правило сработало: link, flood, words, forward, captcha, manual …
  reason text,
  by_user_id bigint,           -- null = сработало само
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mod_actions_chat_idx on public.mod_actions (chat_id, created_at desc);
create index if not exists mod_actions_time_idx on public.mod_actions (created_at desc);
create index if not exists mod_actions_user_idx on public.mod_actions (user_id, created_at desc);

-- ── 3. Предупреждения ──
create table if not exists public.mod_warns (
  id bigint generated always as identity primary key,
  chat_id bigint not null,
  user_id bigint not null,
  reason text,
  by_user_id bigint,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists mod_warns_user_idx on public.mod_warns (chat_id, user_id);

-- ── 4. Стоп-слова: chat_id null = для всех чатов ──
create table if not exists public.mod_words (
  id bigint generated always as identity primary key,
  chat_id bigint,
  word text not null,
  kind text not null default 'word' check (kind in ('word', 'regex')),
  created_by bigint,
  created_at timestamptz not null default now()
);
create index if not exists mod_words_chat_idx on public.mod_words (chat_id);

-- ── 5. Общий чёрный список: бан во всех наших чатах сразу ──
create table if not exists public.mod_gbans (
  user_id bigint primary key,
  user_name text,
  reason text,
  by_user_id bigint,
  created_at timestamptz not null default now()
);

-- ── 6. Капча новичков, ждущая нажатия ──
create table if not exists public.mod_captcha (
  chat_id bigint not null,
  user_id bigint not null,
  message_id bigint,
  deadline timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

-- ── 7. Очередь команд из приложения (бот забирает раз в несколько секунд) ──
create table if not exists public.mod_queue (
  id bigint generated always as identity primary key,
  cmd text not null,           -- ban | unban | ban_all | unban_all
  chat_id bigint,
  user_id bigint not null,
  reason text,
  by_user_id bigint,
  status text not null default 'pending',   -- pending | done | failed
  result text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists mod_queue_pending_idx on public.mod_queue (status, created_at);

alter table public.mod_chats enable row level security;
alter table public.mod_actions enable row level security;
alter table public.mod_warns enable row level security;
alter table public.mod_words enable row level security;
alter table public.mod_gbans enable row level security;
alter table public.mod_captcha enable row level security;
alter table public.mod_queue enable row level security;
revoke all on public.mod_chats, public.mod_actions, public.mod_warns, public.mod_words,
              public.mod_gbans, public.mod_captcha, public.mod_queue from anon, authenticated;

-- ── 8. Функции для приложения ──

-- Сводка: чаты со счётчиками за сутки и общие числа
create or replace function public.admin_mod_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_chats jsonb;
begin
  perform public.admin_require('admin');
  select coalesce(jsonb_agg(x order by x.enabled desc, x.title), '[]'::jsonb) into v_chats from (
    select c.chat_id::text as chat_id, c.title, c.username, c.kind, c.enabled, c.bot_is_admin, c.can_restrict, c.can_delete,
           c.members, c.linked_chat_id::text as linked_chat_id,
           (select count(*) from public.mod_actions a where a.chat_id = c.chat_id and a.created_at > now() - interval '24 hours') as actions_24h
    from public.mod_chats c
  ) x;
  return jsonb_build_object(
    'chats', v_chats,
    'actions_24h', (select count(*) from public.mod_actions where created_at > now() - interval '24 hours'),
    'bans_24h', (select count(*) from public.mod_actions where created_at > now() - interval '24 hours' and action in ('ban', 'gban')),
    'gbans', (select count(*) from public.mod_gbans),
    'queue', (select count(*) from public.mod_queue where status = 'pending'));
end $$;

-- Один чат: настройки и последние числа
create or replace function public.admin_mod_chat(p_chat_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform public.admin_require('admin');
  select jsonb_build_object(
      'chat_id', c.chat_id::text, 'title', c.title, 'username', c.username, 'kind', c.kind, 'enabled', c.enabled,
      'bot_is_admin', c.bot_is_admin, 'can_restrict', c.can_restrict, 'can_delete', c.can_delete, 'members', c.members,
      'linked_chat_id', c.linked_chat_id::text, 'settings', c.settings,
      'stats', jsonb_build_object(
        'deleted_24h', (select count(*) from public.mod_actions a where a.chat_id = c.chat_id and a.action = 'delete' and a.created_at > now() - interval '24 hours'),
        'banned_24h', (select count(*) from public.mod_actions a where a.chat_id = c.chat_id and a.action in ('ban', 'gban') and a.created_at > now() - interval '24 hours'),
        'warned_24h', (select count(*) from public.mod_actions a where a.chat_id = c.chat_id and a.action = 'warn' and a.created_at > now() - interval '24 hours'),
        'words', (select count(*) from public.mod_words w where w.chat_id = c.chat_id)))
    into v from public.mod_chats c where c.chat_id = p_chat_id;
  if v is null then raise exception 'Чат не найден'; end if;
  return v;
end $$;

-- Сохранить настройки чата: пришедшие ключи заменяют старые, остальные остаются
create or replace function public.admin_mod_chat_save(p_chat_id bigint, p_settings jsonb, p_enabled boolean default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_require('admin');
  update public.mod_chats
     set settings = settings || coalesce(p_settings, '{}'::jsonb),
         enabled = coalesce(p_enabled, enabled),
         updated_at = now()
   where chat_id = p_chat_id;
  if not found then raise exception 'Чат не найден'; end if;
  perform public.admin_log('mod_chat_save', 'mod_chat', p_chat_id::text, jsonb_build_object('keys', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(coalesce(p_settings, '{}'::jsonb)) k), 'enabled', p_enabled));
end $$;

-- Применить одни и те же настройки ко всем чатам сразу
create or replace function public.admin_mod_apply_all(p_settings jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  perform public.admin_require('admin');
  update public.mod_chats set settings = settings || coalesce(p_settings, '{}'::jsonb), updated_at = now();
  get diagnostics v_n = row_count;
  perform public.admin_log('mod_apply_all', 'mod_chat', 'all', jsonb_build_object('chats', v_n, 'keys', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(coalesce(p_settings, '{}'::jsonb)) k)));
  return v_n;
end $$;

-- Журнал действий: p_chat_id null = по всем чатам; p_user_id — только про одного человека
create or replace function public.admin_mod_log(p_chat_id bigint default null, p_limit integer default 30, p_offset integer default 0, p_user_id bigint default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_rows jsonb;
begin
  perform public.admin_require('admin');
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_rows from (
    select a.id, a.chat_id::text as chat_id, coalesce(c.title, '') as chat_title, a.user_id::text as user_id, a.user_name,
           a.action, a.rule, a.reason, a.by_user_id::text as by_user_id, a.created_at
      from public.mod_actions a left join public.mod_chats c on c.chat_id = a.chat_id
     where (p_chat_id is null or a.chat_id = p_chat_id) and (p_user_id is null or a.user_id = p_user_id)
     order by a.created_at desc
     limit greatest(least(coalesce(p_limit, 30), 100), 1) offset greatest(coalesce(p_offset, 0), 0)) x;
  return v_rows;
end $$;

-- Стоп-слова: p_chat_id null = общие для всех чатов
create or replace function public.admin_mod_words_list(p_chat_id bigint default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_require('admin');
  return coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'word', w.word, 'kind', w.kind, 'chat_id', w.chat_id::text) order by w.id desc)
                     from public.mod_words w where w.chat_id is not distinct from p_chat_id), '[]'::jsonb);
end $$;

create or replace function public.admin_mod_word_add(p_chat_id bigint, p_word text, p_kind text default 'word') returns void
language plpgsql security definer set search_path = public as $$
declare v_word text := lower(trim(coalesce(p_word, '')));
begin
  perform public.admin_require('admin');
  if length(v_word) < 2 or length(v_word) > 200 then raise exception 'Слово должно быть от 2 до 200 символов'; end if;
  if coalesce(p_kind, 'word') not in ('word', 'regex') then raise exception 'Неизвестный вид'; end if;
  if exists (select 1 from public.mod_words where chat_id is not distinct from p_chat_id and word = v_word) then return; end if;
  insert into public.mod_words (chat_id, word, kind, created_by) values (p_chat_id, v_word, coalesce(p_kind, 'word'), public.app_uid());
end $$;

create or replace function public.admin_mod_word_del(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_require('admin');
  delete from public.mod_words where id = p_id;
end $$;

-- Общий чёрный список
create or replace function public.admin_mod_gban_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_require('admin');
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', g.user_id::text, 'user_name', g.user_name, 'reason', g.reason, 'created_at', g.created_at) order by g.created_at desc)
                     from public.mod_gbans g), '[]'::jsonb);
end $$;

-- Забанить человека во всех чатах (запись + команда боту)
create or replace function public.admin_mod_gban_add(p_user_id bigint, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_by bigint;
begin
  v_by := public.admin_require('admin');
  if p_user_id is null or p_user_id <= 0 then raise exception 'Нужен Telegram ID человека'; end if;
  if exists (select 1 from public.users where user_id = p_user_id and role in ('owner', 'admin', 'support')) then
    raise exception 'Сотрудника банить нельзя';
  end if;
  insert into public.mod_gbans (user_id, user_name, reason, by_user_id)
  values (p_user_id, (select nullif(username, '') from public.users where user_id = p_user_id), left(p_reason, 300), v_by)
  on conflict (user_id) do update set reason = excluded.reason, by_user_id = excluded.by_user_id;
  insert into public.mod_queue (cmd, user_id, reason, by_user_id) values ('ban_all', p_user_id, left(p_reason, 300), v_by);
  perform public.admin_log('mod_gban', 'user', p_user_id::text, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.admin_mod_gban_del(p_user_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_by bigint;
begin
  v_by := public.admin_require('admin');
  delete from public.mod_gbans where user_id = p_user_id;
  insert into public.mod_queue (cmd, user_id, by_user_id) values ('unban_all', p_user_id, v_by);
  perform public.admin_log('mod_ungban', 'user', p_user_id::text, '{}'::jsonb);
end $$;

-- Разбанить в одном чате
create or replace function public.admin_mod_unban(p_chat_id bigint, p_user_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_by bigint;
begin
  v_by := public.admin_require('admin');
  insert into public.mod_queue (cmd, chat_id, user_id, by_user_id) values ('unban', p_chat_id, p_user_id, v_by);
  perform public.admin_log('mod_unban', 'user', p_user_id::text, jsonb_build_object('chat_id', p_chat_id));
end $$;

do $$ declare f text; begin
  foreach f in array array[
    'admin_mod_overview()', 'admin_mod_chat(bigint)', 'admin_mod_chat_save(bigint, jsonb, boolean)', 'admin_mod_apply_all(jsonb)',
    'admin_mod_log(bigint, integer, integer, bigint)', 'admin_mod_words_list(bigint)', 'admin_mod_word_add(bigint, text, text)',
    'admin_mod_word_del(bigint)', 'admin_mod_gban_list()', 'admin_mod_gban_add(bigint, text)', 'admin_mod_gban_del(bigint)',
    'admin_mod_unban(bigint, bigint)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
