-- Правки по ревью Opus к 20261101160000: потолок скидки по промокоду не зависит от «базы» клиента,
-- вспомогательную функцию нельзя вызвать напрямую, настройки отзывов проверяются, правка пишется в журнал.
-- Откат: supabase/rollback/20261101180000_admin_tail_review_fixes_rollback.sql

-- ── 1. _promo_order_check: серверный потолок скидки + запрет прямого вызова ──
-- total_byn в заказе — сумма уже после скидки. Процентная скидка p% от суммы до скидки (B) = B·p/100, а total = B·(1−p/100),
-- значит потолок = total·p/(100−p). Допуск 0,01 на округления. Скидка 100% и выше: потолок 0 (скидку не записываем).
-- Фиксированный код: потолок — сама сумма скидки по коду.
create or replace function public._promo_order_check(p_code text, p_total numeric, p_discount numeric, out o_code text, out o_discount numeric)
language plpgsql security definer set search_path = public as $$
declare
  r public.promocodes;
  v_total numeric := greatest(coalesce(p_total, 0), 0);
  v_cap numeric;
begin
  if pg_trigger_depth() = 0 then
    raise exception 'Недоступно';
  end if;
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
    if coalesce(r.discount_value, 0) <= 0 or r.discount_value >= 100 then
      v_cap := 0;
    else
      v_cap := round(v_total * r.discount_value / (100 - r.discount_value), 2);
    end if;
  else
    v_cap := greatest(coalesce(r.discount_value, 0), 0);
  end if;
  o_code := r.code;
  -- запрошенная скидка в пределах потолка (с допуском 0,01 на округление) остаётся как есть, выше — обрезается до потолка
  o_discount := greatest(case when coalesce(p_discount, 0) <= v_cap + 0.01 then coalesce(p_discount, 0) else v_cap end, 0);
end $$;
revoke all on function public._promo_order_check(text, numeric, numeric) from public, anon;
grant execute on function public._promo_order_check(text, numeric, numeric) to authenticated;

-- ── 2. admin_save_content_settings: проверка reviews_config + запись в журнал ──
-- Ссылки попадают в разметку приложения, поэтому принимаем только обычные http(s)-адреса без кавычек, пробелов, угловых скобок и обратных апострофов.
-- Остальные ключи конфигурации (темы Telegram, бонусные проценты и т.п.) не трогаем: их читает бот.
create or replace function public.admin_save_content_settings(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e jsonb;
  k text;
  v jsonb;
  v_key text;
  v_val jsonb;
  v_txt text;
  v_n integer := 0;
  v_keys text[] := '{}';
  c_url constant text := '^https?://[^\s"''<>\`]{1,250}$';
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
      for k, v in select * from jsonb_each(v_val) loop
        if k like '%\_link' then
          if jsonb_typeof(v) is distinct from 'string' or (v #>> '{}' <> '' and v #>> '{}' !~* c_url) then
            raise exception 'Ссылка «%» указана неверно: нужен адрес вида https://…', k;
          end if;
        elsif k = 'partner_user_ids' then
          if jsonb_typeof(v) is distinct from 'array' or jsonb_array_length(v) > 200
             or exists (select 1 from jsonb_array_elements(v) x where jsonb_typeof(x) is distinct from 'number' or (x #>> '{}') !~ '^[0-9]{1,15}$') then
            raise exception 'Партнёры: только Telegram ID (цифры)';
          end if;
        elsif k = 'social_media_links' then
          if jsonb_typeof(v) is distinct from 'object'
             or exists (select 1 from jsonb_each(v) s where jsonb_typeof(s.value) is distinct from 'string'
                        or (s.value #>> '{}' <> '' and s.value #>> '{}' !~* c_url)) then
            raise exception 'Ссылки на соцсети указаны неверно';
          end if;
        end if;
      end loop;
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
    v_keys := v_keys || v_key;
    v_n := v_n + 1;
  end loop;
  perform public.admin_log('content_settings_saved', 'settings', array_to_string(v_keys, ','), jsonb_build_object('keys', to_jsonb(v_keys)));
  return jsonb_build_object('ok', true, 'saved', v_n);
end $$;
revoke all on function public.admin_save_content_settings(jsonb) from public, anon;
grant execute on function public.admin_save_content_settings(jsonb) to authenticated;
