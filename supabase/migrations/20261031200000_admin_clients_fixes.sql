-- Этап 3, фиксы по ревью (клиенты и паспорта):
--  1. Журнал админа нельзя подделать из браузера: писать в admin_logs может только сервер (admin_log / admin_log_action).
--  2. Админ не читает и не правит kyc_verifications напрямую: только через серверные функции (с журналом).
--  3. users_guard: список закрытых колонок действует для всех, кроме владельца и сервера (баланс, бан, предупреждения).
--  4. Разбан обнуляет предупреждения; награда за UGC-видео идёт через серверную функцию;
--     admin_adjust_balance принимает необязательный ключ защиты от двойного нажатия.

-- ── 1. admin_logs: только чтение для админа ──
drop policy if exists admin_logs_admin on public.admin_logs;
drop policy if exists admin_logs_admin_read on public.admin_logs;
create policy admin_logs_admin_read on public.admin_logs for select to authenticated using (public.app_is_admin());
revoke insert, update, delete, truncate, references, trigger on public.admin_logs from authenticated, anon;
revoke select on public.admin_logs from anon;

-- Запись из старой админки: только известные действия, без права подделать служебные (паспорта, деньги, баны)
create or replace function public.admin_log_action(p_action text, p_details jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_det jsonb := coalesce(p_details, '{}'::jsonb);
begin
  perform public.admin_require('admin');
  if p_action is null or p_action not in ('archive_order', 'create_product', 'create_promo', 'delete_course', 'delete_product',
                                          'export_csv', 'order_status', 'restore_order', 'toggle_promo', 'update_product',
                                          'view_analytics', 'view_transactions') then
    raise exception 'Это действие в журнал вручную не записывается' using errcode = '42501';
  end if;
  if jsonb_typeof(v_det) <> 'object' then
    v_det := jsonb_build_object('value', v_det);
  end if;
  if pg_column_size(v_det) > 4000 then
    v_det := jsonb_build_object('truncated', true);
  end if;
  perform public.admin_log(p_action, null, null, v_det);
end $$;

-- ── 2. kyc_verifications: админ только через функции ──
drop policy if exists kyc_verifications_admin on public.kyc_verifications;

-- ── 3. users_guard: закрытые колонки для всех, кроме владельца и сервера ──
create or replace function public.users_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  o jsonb;
  n jsonb;
  c text;
  locked text[] := array['user_id', 'auth_id', 'telegram_id', 'ices_balance', 'role', 'referral_count', 'referral_bonus',
                         'referrer_id', 'is_trusted', 'is_banned', 'ban_reason', 'ban_expires_at', 'warnings_count', 'is_toxic',
                         'kyc_verified_at', 'total_spent', 'orders_count', 'client_level', 'vault_passport', 'encrypted_passport',
                         'encrypted_card', 'last_spin', 'created_at'];
begin
  -- роль меняет только владелец (через admin_set_role) или сервер; админ из браузера — нет
  if tg_op = 'UPDATE' and new.role is distinct from old.role
     and current_user in ('authenticated', 'anon') and not public.app_is_owner() then
    raise exception 'Роли выдаёт только владелец' using errcode = '42501';
  end if;

  -- сервер (бот, серверные функции) и владелец — без ограничений; админ из браузера ограничен как обычный клиент
  if current_user not in ('authenticated', 'anon') or public.app_is_owner() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'user';
    new.ices_balance := 0;
    new.referral_count := 0;
    new.referral_bonus := 0;
    new.is_trusted := false;
    new.is_banned := false;
    new.kyc_verified_at := null;
    new.vault_passport := null;
    new.encrypted_card := null;
    return new;
  end if;

  o := to_jsonb(old);
  n := to_jsonb(new);
  foreach c in array locked loop
    if (o -> c) is distinct from (n -> c) then
      raise exception 'Поле % меняется только сервером', c using errcode = '42501';
    end if;
  end loop;

  -- реферальный код можно задать один раз
  if old.referral_code is not null and new.referral_code is distinct from old.referral_code then
    raise exception 'Реферальный код уже задан' using errcode = '42501';
  end if;
  -- проверку паспорта клиент может только отправить «на проверку»
  if new.kyc_status is distinct from old.kyc_status and new.kyc_status <> 'pending' then
    raise exception 'Статус проверки меняет оператор' using errcode = '42501';
  end if;

  -- служебные ключи настроек: колесо удачи, семья — только сервер; бесплатные доставки можно только тратить
  if new.settings is distinct from old.settings then
    new.settings := coalesce(new.settings, '{}'::jsonb);
    new.settings := new.settings - 'last_fortune_spin' - 'family';
    if old.settings ? 'last_fortune_spin' then
      new.settings := jsonb_set(new.settings, '{last_fortune_spin}', old.settings -> 'last_fortune_spin');
    end if;
    if old.settings ? 'family' then
      new.settings := jsonb_set(new.settings, '{family}', old.settings -> 'family');
    end if;
    if coalesce((new.settings ->> 'free_delivery_tokens')::numeric, 0) > coalesce((old.settings ->> 'free_delivery_tokens')::numeric, 0) then
      new.settings := jsonb_set(new.settings, '{free_delivery_tokens}', coalesce(old.settings -> 'free_delivery_tokens', '0'::jsonb));
    end if;
  end if;
  return new;
end $$;

-- Награда за UGC-видео: раньше админ правил ices_balance прямо из браузера
create or replace function public.admin_ugc_decision(p_id uuid, p_approve boolean, p_reward numeric default 0, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  u public.ugc_videos;
  v_reward numeric := round(coalesce(p_reward, 0), 2);
  v_after numeric;
begin
  select * into u from public.ugc_videos where id = p_id for update;
  if not found then
    raise exception 'Видео не найдено';
  end if;
  if u.status is distinct from 'pending' then
    raise exception 'Это видео уже проверено';
  end if;
  if p_approve then
    if v_reward < 0 or v_reward > 1000 then
      raise exception 'Награда: от 0 до 1000';
    end if;
    if v_reward > 0 then
      v_after := public.wallet_move(u.user_id, v_reward, 'CREDIT', 'UGC_REWARD', 'BONUS', u.order_id, null, 'ugc:' || u.id);
    end if;
    update public.ugc_videos
       set status = 'approved', reward_ices = v_reward, moderated_by = v_me, moderated_at = now()
     where id = u.id;
    perform public.admin_log('ugc_approve', 'ugc_video', u.id::text, jsonb_build_object('reward', v_reward, 'uploader', u.user_id));
  else
    update public.ugc_videos
       set status = 'rejected', reject_reason = coalesce(left(nullif(trim(coalesce(p_reason, '')), ''), 300), 'Не соответствует требованиям'),
           moderated_by = v_me, moderated_at = now()
     where id = u.id;
    perform public.admin_log('ugc_reject', 'ugc_video', u.id::text, jsonb_build_object('uploader', u.user_id));
  end if;
  return jsonb_build_object('status', case when p_approve then 'approved' else 'rejected' end, 'balance', v_after);
end $$;

-- ── 4. Разбан обнуляет предупреждения (иначе следующее же предупреждение снова банит) ──
create or replace function public.admin_user_restrict(p_user bigint, p_action text, p_reason text default null, p_days integer default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  t public.users;
  v_reason text := left(nullif(trim(coalesce(p_reason, '')), ''), 300);
  v_exp timestamp;
  v_warn integer;
  v_auto boolean := false;
begin
  if p_action not in ('ban', 'unban', 'warn', 'toxic', 'untoxic') then
    raise exception 'Неизвестное действие';
  end if;
  select * into t from public.users where user_id = p_user for update;
  if not found then
    raise exception 'Клиент не найден';
  end if;
  if t.user_id = v_me then
    raise exception 'Нельзя ограничить самого себя';
  end if;
  if t.role = 'owner' or (t.role = 'admin' and not public.app_is_owner()) then
    raise exception 'Этого сотрудника ограничить нельзя';
  end if;

  if p_action = 'ban' then
    if v_reason is null or char_length(v_reason) < 3 then
      raise exception 'Укажите причину блокировки';
    end if;
    if p_days is not null and (p_days < 1 or p_days > 365) then
      raise exception 'Срок блокировки: от 1 до 365 дней или без срока';
    end if;
    v_exp := case when p_days is null then null else (now() at time zone 'utc') + make_interval(days => p_days) end;
    update public.users set is_banned = true, ban_reason = v_reason, ban_expires_at = v_exp where user_id = t.user_id;
    perform public.admin_log('ban_user', 'user', t.user_id::text, jsonb_build_object('reason', v_reason, 'days', p_days));
  elsif p_action = 'unban' then
    if not coalesce(t.is_banned, false) then
      raise exception 'Клиент не заблокирован';
    end if;
    update public.users set is_banned = false, ban_reason = null, ban_expires_at = null, warnings_count = 0 where user_id = t.user_id;
    perform public.admin_log('unban_user', 'user', t.user_id::text, jsonb_build_object('warnings_before', coalesce(t.warnings_count, 0)));
  elsif p_action = 'warn' then
    if v_reason is null or char_length(v_reason) < 3 then
      raise exception 'Укажите, за что предупреждение';
    end if;
    v_warn := coalesce(t.warnings_count, 0) + 1;
    update public.users set warnings_count = v_warn where user_id = t.user_id;
    perform public.admin_log('warn_user', 'user', t.user_id::text, jsonb_build_object('reason', v_reason, 'warnings_count', v_warn));
    if v_warn >= 3 and not coalesce(t.is_banned, false) then
      update public.users set is_banned = true, ban_reason = 'Автоблокировка: 3 предупреждения', ban_expires_at = null where user_id = t.user_id;
      perform public.admin_log('ban_user', 'user', t.user_id::text, jsonb_build_object('reason', 'Автоблокировка: 3 предупреждения', 'days', null, 'auto', true));
      v_auto := true;
    end if;
  elsif p_action = 'toxic' then
    update public.users set is_toxic = true where user_id = t.user_id;
    perform public.admin_log('mark_toxic', 'user', t.user_id::text, jsonb_build_object('reason', v_reason));
  else
    update public.users set is_toxic = false where user_id = t.user_id;
    perform public.admin_log('unmark_toxic', 'user', t.user_id::text, '{}'::jsonb);
  end if;

  select * into t from public.users where user_id = p_user;
  return jsonb_build_object('banned', coalesce(t.is_banned, false), 'ban_reason', t.ban_reason, 'ban_expires_at', t.ban_expires_at,
                            'warnings', coalesce(t.warnings_count, 0), 'toxic', coalesce(t.is_toxic, false), 'auto_ban', v_auto);
end $$;

-- ── 5. Баланс: необязательный ключ защиты от двойного нажатия ──
drop function if exists public.admin_adjust_balance(bigint, numeric, text);
create or replace function public.admin_adjust_balance(p_user bigint, p_amount numeric, p_reason text, p_idempotency_key text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('owner');
  v_amount numeric := round(coalesce(p_amount, 0), 2);
  v_key text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_src text;
  v_after numeric;
begin
  if v_amount = 0 then
    raise exception 'Сумма не может быть нулевой';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Укажите причину';
  end if;
  if v_key is not null and char_length(v_key) > 100 then
    raise exception 'Слишком длинный ключ повтора';
  end if;
  perform 1 from public.users where user_id = p_user for update;
  if not found then
    raise exception 'Пользователь не найден';
  end if;
  v_src := 'admin:' || v_me || ':' || coalesce(v_key, gen_random_uuid()::text);
  if v_key is not null then
    select e.balance_after into v_after from public.balance_entries e where e.source_transaction_id = v_src;
    if found then
      return jsonb_build_object('balance', v_after, 'duplicate', true);
    end if;
  end if;
  v_after := public.wallet_move(p_user, abs(v_amount), case when v_amount > 0 then 'CREDIT' else 'DEBIT' end,
                                'ADMIN_ADJUSTMENT', 'ADJUSTMENT', null, null, v_src);
  perform public.admin_log('adjust_balance', 'user', p_user::text,
                           jsonb_build_object('amount', v_amount, 'reason', trim(p_reason), 'balance_after', v_after));
  return jsonb_build_object('balance', v_after);
end $$;

revoke all on function public.admin_log_action(text, jsonb), public.admin_ugc_decision(uuid, boolean, numeric, text),
  public.admin_user_restrict(bigint, text, text, integer), public.admin_adjust_balance(bigint, numeric, text, text) from public, anon;
grant execute on function public.admin_log_action(text, jsonb), public.admin_ugc_decision(uuid, boolean, numeric, text),
  public.admin_user_restrict(bigint, text, text, integer), public.admin_adjust_balance(bigint, numeric, text, text) to authenticated;
