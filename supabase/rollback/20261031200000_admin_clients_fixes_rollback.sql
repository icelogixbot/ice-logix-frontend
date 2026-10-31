-- Откат миграции 20261031200000_admin_clients_fixes.sql: возвращает прежние права админа
-- (запись в журнал и чтение паспортов напрямую, старая защита users_guard), старые версии функций.

drop function if exists public.admin_log_action(text, jsonb);
drop function if exists public.admin_ugc_decision(uuid, boolean, numeric, text);

-- журнал и паспорта: прежние политики «админ может всё»
drop policy if exists admin_logs_admin_read on public.admin_logs;
drop policy if exists admin_logs_admin on public.admin_logs;
create policy admin_logs_admin on public.admin_logs for all to authenticated using (public.app_is_admin()) with check (public.app_is_admin());
grant insert, update, delete on public.admin_logs to authenticated;

drop policy if exists kyc_verifications_admin on public.kyc_verifications;
create policy kyc_verifications_admin on public.kyc_verifications for all to authenticated using (public.app_is_admin()) with check (public.app_is_admin());

-- users_guard: прежний ранний выход для любого админа
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

  if public.app_is_privileged() then
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

-- разбан без обнуления предупреждений
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
    update public.users set is_banned = false, ban_reason = null, ban_expires_at = null where user_id = t.user_id;
    perform public.admin_log('unban_user', 'user', t.user_id::text, '{}'::jsonb);
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

-- баланс без ключа повтора
drop function if exists public.admin_adjust_balance(bigint, numeric, text, text);
create or replace function public.admin_adjust_balance(p_user bigint, p_amount numeric, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('owner');
  v_amount numeric := round(coalesce(p_amount, 0), 2);
  v_after numeric;
begin
  if v_amount = 0 then
    raise exception 'Сумма не может быть нулевой';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Укажите причину';
  end if;
  perform 1 from public.users where user_id = p_user for update;
  if not found then
    raise exception 'Пользователь не найден';
  end if;
  v_after := public.wallet_move(p_user, abs(v_amount), case when v_amount > 0 then 'CREDIT' else 'DEBIT' end,
                                'ADMIN_ADJUSTMENT', 'ADJUSTMENT', null, null, 'admin:' || v_me || ':' || gen_random_uuid());
  perform public.admin_log('adjust_balance', 'user', p_user::text,
                           jsonb_build_object('amount', v_amount, 'reason', trim(p_reason), 'balance_after', v_after));
  return jsonb_build_object('balance', v_after);
end $$;

revoke all on function public.admin_adjust_balance(bigint, numeric, text) from public, anon;
grant execute on function public.admin_adjust_balance(bigint, numeric, text) to authenticated;
