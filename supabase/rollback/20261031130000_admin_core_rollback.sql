-- Откат 20261031130000_admin_core.
-- Запуск: npx supabase db query --linked -f supabase/rollback/20261031130000_admin_core_rollback.sql
-- Внимание: если у заказов уже стоят статусы awaiting_decision / awaiting_payment / paid_second, старое ограничение не встанет —
-- сначала переведите такие заказы в другой статус.

drop function if exists public.admin_overview();
drop function if exists public.admin_set_role(bigint, text);
drop function if exists public.admin_adjust_balance(bigint, numeric, text);
drop function if exists public.admin_review_decision(uuid, boolean, text);
drop function if exists public.admin_claim_decision(uuid, boolean, numeric, text);
drop function if exists public.admin_set_vacation(boolean, integer);
drop function if exists public.admin_require(text);
drop function if exists public.admin_log(text, text, text, jsonb);

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status = any (array[
  'pending', 'price_calculated', 'waiting_payment', 'paid', 'bought', 'on_sklad_cn', 'in_transit', 'in_belarus', 'delivered', 'cancelled']));

create or replace function public.get_public_config() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'buyer_vacation', coalesce(settings -> 'buyer_vacation', '{"active": false, "days": 0}'::jsonb),
    'exchange_buffer', settings -> 'exchange_buffer')
  from public.users where role = 'owner' order by user_id limit 1
$$;

-- users_guard без проверки «роли выдаёт только владелец»
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
  if public.app_is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := 'user'; new.ices_balance := 0; new.referral_count := 0; new.referral_bonus := 0;
    new.is_trusted := false; new.is_banned := false; new.kyc_verified_at := null; new.vault_passport := null; new.encrypted_card := null;
    return new;
  end if;
  o := to_jsonb(old);
  n := to_jsonb(new);
  foreach c in array locked loop
    if (o -> c) is distinct from (n -> c) then
      raise exception 'Поле % меняется только сервером', c using errcode = '42501';
    end if;
  end loop;
  if old.referral_code is not null and new.referral_code is distinct from old.referral_code then
    raise exception 'Реферальный код уже задан' using errcode = '42501';
  end if;
  if new.kyc_status is distinct from old.kyc_status and new.kyc_status <> 'pending' then
    raise exception 'Статус проверки меняет оператор' using errcode = '42501';
  end if;
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

drop function if exists public.app_is_owner();
-- строки settings 'buyer_vacation' и 'exchange_buffer' оставлены: старая функция их не читает
