-- Откат 20261101180000: возвращает функции из 20261101160000 (без потолка от суммы заказа и без проверки reviews_config).

create or replace function public._promo_order_check(p_code text, p_total numeric, p_discount numeric, out o_code text, out o_discount numeric)
language plpgsql security definer set search_path = public as $$
declare
  r public.promocodes;
  v_base numeric := greatest(coalesce(p_total, 0), 0) + greatest(coalesce(p_discount, 0), 0);
  v_cap numeric;
begin
  select * into r from public.promocodes
   where upper(code) = upper(trim(coalesce(p_code, ''))) and coalesce(is_active, true)
   order by created_at limit 1 for update;
  if not found then
    raise exception 'Промокод не найден или отключён';
  end if;
  if r.expires_at is not null and r.expires_at <= now() then
    raise exception 'Срок действия промокода закончился';
  end if;
  if r.usage_limit is not null and public._promo_used(r.code) >= r.usage_limit then
    raise exception 'Промокод уже использован максимальное число раз';
  end if;
  if r.discount_type = 'percent' then
    v_cap := round(v_base * r.discount_value / 100, 2);
  else
    v_cap := least(r.discount_value, v_base);
  end if;
  o_code := r.code;
  o_discount := greatest(least(coalesce(p_discount, 0), v_cap), 0);
end $$;
revoke all on function public._promo_order_check(text, numeric, numeric) from public, anon;
grant execute on function public._promo_order_check(text, numeric, numeric) to authenticated;

create or replace function public.admin_save_content_settings(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e jsonb;
  v_key text;
  v_val jsonb;
  v_txt text;
  v_n integer := 0;
begin
  perform public.admin_require('admin');
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 10 then
    raise exception 'Нечего сохранять';
  end if;
  for e in select * from jsonb_array_elements(p_rows) loop
    v_key := e ->> 'key';
    v_val := e -> 'value';
    v_txt := v_val #>> '{}';
    if v_key = 'reviews_config' then
      if jsonb_typeof(v_val) is distinct from 'object' or length(v_val::text) > 5000 then
        raise exception 'Настройки отзывов указаны неверно';
      end if;
    elsif v_key = 'drop_weekday' then
      if jsonb_typeof(v_val) is distinct from 'string' or v_txt !~ '^[1-7]$' then raise exception 'День недели указан неверно'; end if;
    elsif v_key = 'drop_hour' then
      if jsonb_typeof(v_val) is distinct from 'string' or v_txt !~ '^([0-9]|1[0-9]|2[0-3])$' then raise exception 'Час начала — от 0 до 23'; end if;
    elsif v_key = 'drop_minute' then
      if jsonb_typeof(v_val) is distinct from 'string' or v_txt !~ '^([0-9]|[1-5][0-9])$' then raise exception 'Минуты начала — от 0 до 59'; end if;
    elsif v_key = 'drop_duration_min' then
      if jsonb_typeof(v_val) is distinct from 'string' or v_txt !~ '^[0-9]{1,4}$' or v_txt::integer not between 1 and 1440 then
        raise exception 'Длительность — от 1 до 1440 минут';
      end if;
    elsif v_key = 'drop_enabled' then
      if jsonb_typeof(v_val) is distinct from 'string' or v_txt not in ('true', 'false') then raise exception 'Включение дропа указано неверно'; end if;
    else
      raise exception 'Эту настройку админ менять не может';
    end if;
    insert into public.settings (key, value, updated_at) values (v_key, v_val, now())
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'saved', v_n);
end $$;
revoke all on function public.admin_save_content_settings(jsonb) from public, anon;
grant execute on function public.admin_save_content_settings(jsonb) to authenticated;
