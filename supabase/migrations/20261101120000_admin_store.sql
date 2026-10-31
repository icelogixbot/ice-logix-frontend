-- Админка, этап «Витрина»: промокоды со сроком и лимитом, рассылка новостей из приложения.
-- Все админские функции: security definer, search_path = public, первая строка — admin_require.
-- Откат: supabase/rollback/20261101120000_admin_store_rollback.sql

-- ── 1. Промокоды: срок действия и лимит использований ──
alter table public.promocodes add column if not exists expires_at timestamptz;
alter table public.promocodes add column if not exists usage_limit integer check (usage_limit is null or usage_limit > 0);

-- Сколько раз код уже использован: заказы с этим кодом, кроме отменённых. Снаружи не вызывается.
create or replace function public._promo_used(p_code text) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.orders
   where upper(promo_code) = upper(trim(p_code)) and lower(coalesce(status, '')) not in ('cancelled', 'canceled')
$$;
revoke all on function public._promo_used(text) from public, anon, authenticated;

-- Проверка кода клиентом: теперь учитывает срок и лимит. Форма ответа прежняя; при отказе добавлено 'reason':
-- 'expired' (срок вышел) или 'exhausted' (лимит исчерпан) — приложение покажет понятный текст.
create or replace function public.check_promocode(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r public.promocodes;
begin
  select * into r from public.promocodes where upper(code) = upper(trim(p_code)) and coalesce(is_active, true) limit 1;
  if not found then
    return jsonb_build_object('valid', false);
  end if;
  if r.expires_at is not null and r.expires_at <= now() then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;
  if r.usage_limit is not null and public._promo_used(r.code) >= r.usage_limit then
    return jsonb_build_object('valid', false, 'reason', 'exhausted');
  end if;
  return jsonb_build_object('valid', true, 'id', r.id, 'code', r.code, 'discount_type', r.discount_type, 'discount_value', r.discount_value);
end $$;

-- Список для админки: каждый код с числом применений и суммой скидок.
create or replace function public.admin_promocodes() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_require('admin');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'code', p.code, 'discount_type', p.discount_type, 'discount_value', p.discount_value,
      'is_active', coalesce(p.is_active, true), 'expires_at', p.expires_at, 'usage_limit', p.usage_limit,
      'created_at', p.created_at,
      'used', public._promo_used(p.code),
      'discount_sum', coalesce((select sum(o.discount_applied) from public.orders o
                                 where upper(o.promo_code) = upper(p.code) and lower(coalesce(o.status, '')) not in ('cancelled', 'canceled')), 0)
    ) order by p.created_at desc)
    from public.promocodes p), '[]'::jsonb);
end $$;

-- Создание и правка кода одной функцией (p_id null — новый). Тип: percent | fixed. Размер: процент 1–100 или сумма > 0.
create or replace function public.admin_promocode_save(
  p_id uuid, p_code text, p_type text, p_value numeric, p_active boolean, p_expires timestamptz, p_limit integer
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_type text := lower(trim(coalesce(p_type, '')));
  v_id uuid;
begin
  perform public.admin_require('admin');
  if v_code !~ '^[A-Z0-9_-]{3,30}$' then
    raise exception 'Код: 3–30 символов, латинские буквы, цифры, - и _';
  end if;
  if v_type not in ('percent', 'fixed') then
    raise exception 'Выберите тип скидки';
  end if;
  if p_value is null or p_value <= 0 or (v_type = 'percent' and p_value > 100) then
    raise exception 'Размер скидки указан неверно';
  end if;
  if p_limit is not null and p_limit <= 0 then
    raise exception 'Лимит должен быть больше нуля';
  end if;
  if exists (select 1 from public.promocodes where upper(code) = v_code and id is distinct from p_id) then
    raise exception 'Такой код уже есть';
  end if;
  if p_id is null then
    insert into public.promocodes (code, discount_type, discount_value, is_active, expires_at, usage_limit)
    values (v_code, v_type, round(p_value, 2), coalesce(p_active, true), p_expires, p_limit)
    returning id into v_id;
  else
    update public.promocodes
       set code = v_code, discount_type = v_type, discount_value = round(p_value, 2), is_active = coalesce(p_active, true),
           expires_at = p_expires, usage_limit = p_limit
     where id = p_id returning id into v_id;
    if v_id is null then
      raise exception 'Промокод не найден';
    end if;
  end if;
  perform public.admin_log('promocode_save', 'promocode', v_id::text,
    jsonb_build_object('code', v_code, 'type', v_type, 'value', p_value, 'active', coalesce(p_active, true), 'expires', p_expires, 'limit', p_limit));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- ── 2. Рассылка новостей из приложения ──
-- p_dry_run = true — только «получат N человек». Повтор с тем же p_key второй раз никого не добавит (защита от двойного нажатия).
create or replace function public.admin_send_news(p_title text, p_text text, p_key text, p_dry_run boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_text text := trim(coalesce(p_text, ''));
  v_key text := trim(coalesce(p_key, ''));
  v_count integer;
begin
  perform public.admin_require('admin');
  if length(v_title) < 3 or length(v_title) > 100 then
    raise exception 'Заголовок: от 3 до 100 символов';
  end if;
  if length(v_text) < 10 or length(v_text) > 1000 then
    raise exception 'Текст: от 10 до 1000 символов';
  end if;
  if coalesce(p_dry_run, true) then
    return jsonb_build_object('ok', true, 'dry_run', true, 'recipients', public.enqueue_news(v_title, v_text, 'preview', true));
  end if;
  if v_key !~ '^[A-Za-z0-9_-]{8,64}$' then
    raise exception 'Не хватает ключа отправки';
  end if;
  v_count := public.enqueue_news(v_title, v_text, 'admin:' || v_key, false);
  perform public.admin_log('news_send', 'news', v_key, jsonb_build_object('title', v_title, 'recipients', v_count));
  return jsonb_build_object('ok', true, 'dry_run', false, 'recipients', v_count);
end $$;

revoke all on function public.admin_promocodes(), public.admin_promocode_save(uuid, text, text, numeric, boolean, timestamptz, integer),
  public.admin_send_news(text, text, text, boolean) from public, anon;
grant execute on function public.admin_promocodes(), public.admin_promocode_save(uuid, text, text, numeric, boolean, timestamptz, integer),
  public.admin_send_news(text, text, text, boolean) to authenticated;
