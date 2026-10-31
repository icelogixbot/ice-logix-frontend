-- Откат 20261031100000_close_fortune_wheel: колесо снова крутится, два кода с колеса и купон владельца возвращаются.
-- Запуск: npx supabase db query --linked -f supabase/rollback/20261031100000_close_fortune_wheel_rollback.sql
-- В приложении колесо закрыто отдельно: showWheelOfFortuneModal в app-core.js и карточка в promos-history.js (тег checkpoint/before-wheel-close).

create or replace function public.spin_fortune_wheel()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid bigint := public.app_require_uid();
  v_rewards jsonb := '[
    {"type": "ice", "value": 5, "weight": 40},
    {"type": "ice", "value": 10, "weight": 25},
    {"type": "ice", "value": 20, "weight": 10},
    {"type": "promo", "value": 5, "weight": 10},
    {"type": "promo", "value": 10, "weight": 5},
    {"type": "delivery", "value": 1, "weight": 5},
    {"type": "try_again", "value": 0, "weight": 5}
  ]'::jsonb;
  v_settings jsonb;
  v_last timestamptz;
  v_total numeric := 0;
  v_roll numeric;
  v_sum numeric := 0;
  v_idx int;
  r jsonb;
  v_promo text;
  v_bal numeric;
begin
  select coalesce(settings, '{}'::jsonb) into v_settings from public.users where user_id = v_uid for update;
  begin
    v_last := nullif(v_settings ->> 'last_fortune_spin', '')::timestamptz;
  exception when others then
    v_last := null;
  end;
  if v_last is not null and v_last > now() - interval '24 hours' then
    raise exception 'Колесо доступно раз в сутки' using errcode = 'P0001';
  end if;

  select sum((x ->> 'weight')::numeric) into v_total from jsonb_array_elements(v_rewards) x;
  v_roll := random() * v_total;
  for i in 0 .. jsonb_array_length(v_rewards) - 1 loop
    v_sum := v_sum + (v_rewards -> i ->> 'weight')::numeric;
    if v_roll < v_sum then
      v_idx := i;
      exit;
    end if;
  end loop;
  v_idx := coalesce(v_idx, jsonb_array_length(v_rewards) - 1);
  r := v_rewards -> v_idx;

  v_settings := jsonb_set(v_settings, '{last_fortune_spin}', to_jsonb(now()));
  if r ->> 'type' = 'delivery' then
    v_settings := jsonb_set(v_settings, '{free_delivery_tokens}',
                            to_jsonb(coalesce((v_settings ->> 'free_delivery_tokens')::int, 0) + 1));
  end if;
  update public.users set settings = v_settings where user_id = v_uid;

  if r ->> 'type' = 'ice' then
    perform public.wallet_move(v_uid, (r ->> 'value')::numeric, 'CREDIT', 'FORTUNE_WHEEL', 'BONUS', null, null,
                               'wheel:' || v_uid || ':' || to_char(now(), 'YYYYMMDDHH24MISS'));
  elsif r ->> 'type' = 'promo' then
    v_promo := 'ICE' || (r ->> 'value') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    insert into public.promocodes (code, discount_type, discount_value, is_active)
    values (v_promo, 'percent', (r ->> 'value')::numeric, true);
  end if;
  select ices_balance into v_bal from public.users where user_id = v_uid;
  return jsonb_build_object('index', v_idx, 'type', r ->> 'type', 'value', r -> 'value',
                            'promo_code', v_promo, 'balance', v_bal, 'settings', v_settings);
end $function$;

update public.promocodes
   set is_active = true
 where id in ('dfa5eef3-892a-411a-9dce-90061eb7a2fc', 'ae32afa8-eb37-44ed-babd-50b54fd2e500');

update public.users
   set settings = jsonb_set(settings, '{free_delivery_tokens}', '1'::jsonb)
 where user_id = 6107097715;
