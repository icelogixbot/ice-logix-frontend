-- Сервер сверяет цену заказа, который клиент посчитал у себя (сумма + курс).
-- Расхождение только помечает заказ (flags: price_mismatch + price:<причина>) и шлёт событие в админ-группу;
-- заказ не блокируется. Привилегированные вставки (админ, сервис) не проверяются — как и остальной orders_guard.

create or replace function public._jnum(v jsonb) returns numeric
language sql immutable set search_path = public as $f$
  select case
    when jsonb_typeof(v) = 'number' then (v #>> '{}')::numeric
    when jsonb_typeof(v) = 'string' and btrim(v #>> '{}') ~ '^-?[0-9]+(\.[0-9]+)?$' then btrim(v #>> '{}')::numeric
  end
$f$;

create or replace function public._order_price_check(o public.orders)
returns text[]
language plpgsql
stable
set search_path = public
as $$
-- Сверка цены заказа, который клиент посчитал у себя: только сообщает о расхождениях, заказ не блокирует.
-- Формула: calculator.js recalculateOrderTotals + pricing-engine.js. Курсы плавают — пределы с запасом.
declare
  s jsonb := o.first_payment_snapshot;
  r text[] := '{}';
  bad text[] := '{}';
  it jsonb;
  n int := 0;
  qty numeric := 0;
  w numeric := 0;
  lo numeric := 0;
  hi numeric := 0;
  p numeric; q numeric; cur text; blo numeric; bhi numeric;
  tol numeric;
  prod numeric; buf numeric; com numeric; pack numeric; dlv numeric; res numeric; rem numeric;
  ins numeric; vid numeric; cus numeric; tot numeric; e numeric; ex numeric; ex_lo numeric; ex_hi numeric;
begin
  if pg_trigger_depth() = 0 then
    return '{}';  -- только из триггера orders_guard; прямой вызов через API ничего не раскрывает
  end if;
  if s is null or jsonb_typeof(s) <> 'object' or not (s ? 'product_cost_byn') then
    return array['нет расчёта цены'];
  end if;

  if jsonb_typeof(o.items) = 'array' then
    for it in select value from jsonb_array_elements(o.items) loop
      n := n + 1;
      p := public._jnum(it->'price');
      q := coalesce(public._jnum(it->'quantity'), 1);
      if p is null or p < 0 or q <= 0 or q <> trunc(q) then
        r := r || 'позиция без цены или количества'::text;
        continue;
      end if;
      cur := upper(coalesce(nullif(it->>'currency', ''), 'CNY'));  -- как в калькуляторе
      select b.l, b.h into blo, bhi from (values
        ('BYN', 1, 1), ('CNY', 0.35, 0.55), ('USD', 2.6, 4.0), ('EUR', 2.8, 4.4), ('RUB', 0.025, 0.05),
        ('PLN', 0.6, 1.0), ('GBP', 2.5, 6.6), ('JPY', 0.013, 0.035), ('KRW', 0.0014, 0.0038),
        ('AED', 0.53, 1.42), ('VND', 0.00008, 0.0002), ('TRY', 0.056, 0.15)
      ) b(c, l, h) where b.c = cur;
      if blo is null then blo := 2.6; bhi := 4.0; end if;  -- неизвестная валюта: движок берёт курс доллара
      lo := lo + p * q * blo;
      hi := hi + p * q * bhi;
      qty := qty + q;
      w := w + coalesce(nullif(public._jnum(it->'weight'), 0), 0.3);  -- вес позиции бывает уже за все штуки: берём нижнюю границу
    end loop;
  end if;
  if n = 0 then
    r := r || 'нет позиций'::text;
  end if;

  tol := 0.05 + 0.02 * greatest(n, 1) + 0.006 * qty;  -- округления по каждой штуке
  prod := coalesce(public._jnum(s->'product_cost_byn'), 0);
  buf  := coalesce(public._jnum(s->'currency_buffer_byn'), 0);
  com  := coalesce(public._jnum(s->'commission_byn'), 0);
  pack := coalesce(public._jnum(s->'packaging_cost_byn'), 0);
  dlv  := coalesce(public._jnum(s->'delivery_cost_byn'), 0);
  res  := coalesce(public._jnum(s->'delivery_reserve_byn'), 0);
  rem  := coalesce(public._jnum(s->'delivery_remainder_est_byn'), 0);
  ins  := coalesce(public._jnum(s->'insurance_byn'), 0);
  vid  := coalesce(public._jnum(s->'video_check_byn'), 0);
  cus  := coalesce(public._jnum(s->'customs_duty_byn'), 0);
  tot  := coalesce(o.total_byn, 0);

  -- суммы в колонках заказа = суммы в расчёте
  if abs(coalesce(o.price_byn, -1) - prod) > tol then bad := bad || 'товар'::text; end if;
  if abs(coalesce(o.commission_byn, -1) - com) > tol then bad := bad || 'комиссия'::text; end if;
  if abs(coalesce(o.currency_buffer_byn, -1) - buf) > tol then bad := bad || 'валютный запас'::text; end if;
  if abs(coalesce(o.customs_duty_byn, -1) - cus) > tol then bad := bad || 'пошлина'::text; end if;
  if abs(coalesce(o.insurance_byn, -1) - ins) > tol then bad := bad || 'страховка'::text; end if;
  if abs(coalesce(o.delivery_reserve_amount, -1) - res) > tol then bad := bad || 'резерв доставки'::text; end if;
  if abs(tot - coalesce(public._jnum(s->'total_byn'), -1)) > tol then bad := bad || 'итог'::text; end if;
  if cardinality(bad) > 0 then
    r := r || ('в заказе не те суммы, что в расчёте: ' || array_to_string(bad, ', '));
  end if;

  if least(prod, buf, com, pack, dlv, res, rem, ins, vid, cus, tot) < 0 then
    r := r || 'отрицательные суммы'::text;
  end if;
  if n > 0 and (prod < lo - tol or prod > hi + tol) then
    r := r || 'стоимость товара не сходится с ценой и курсом'::text;
  end if;
  if abs(buf - prod * 0.03) > tol then r := r || 'валютный запас не 3%'::text; end if;
  if com < 0.16 * (prod + buf) - tol then r := r || 'комиссия ниже минимальной'::text; end if;
  if pack < 18 - 0.005 then r := r || 'упаковка дешевле 18'::text; end if;
  if dlv < w * 4 * 2.6 * 0.95 - tol then r := r || 'доставка дешевле минимального тарифа'::text; end if;
  if abs(res - round(dlv * 0.7, 2)) > tol or abs(rem - (dlv - res)) > tol then
    r := r || 'доставка разбита на части неверно'::text;
  end if;
  if ins < dlv * 0.02 - tol then r := r || 'страховка ниже 2% доставки'::text; end if;
  if vid not in (0, 10) then r := r || 'неверная цена видеопроверки'::text; end if;
  if cus < 0.15 * (prod - 1760) - tol then r := r || 'пошлина занижена'::text; end if;

  -- итог: всё, что вне доп. услуг; разница = доп. услуги (фото, замеры, упаковка, минус скидка за объединение)
  e := prod + buf + com + pack + res + vid + cus + rem + ins
       - coalesce(o.discount_applied, 0) - coalesce(o.ice_bonus_discount, 0);
  ex := tot - e;
  ex_lo := (case when o.extra_services->>'extra_photo' = 'true' then 3 else 0 end)
         + (case when o.extra_services->>'extra_measure' = 'true' then 3 else 0 end)
         - (case when n >= 2 then 3 * least(n, 3) else 0 end);  -- объединение: −3 на страну, стран не больше трёх
  ex_hi := 6 + 20 * greatest(n, 1);
  if tot <= 0.005 then
    if e + ex_lo > tol then r := r || 'итог занижен'::text; end if;  -- ноль законен, только когда скидки съели всю сумму
  elsif ex < ex_lo - tol then
    r := r || 'итог занижен'::text;
  elsif ex > ex_hi + tol then
    r := r || 'итог завышен'::text;
  end if;

  return r;
exception when others then
  return array['цену проверить не удалось'];
end $$;

CREATE OR REPLACE FUNCTION public.orders_guard()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
declare
  v_r text[];
begin
  if public.app_is_privileged() then
    return new;
  end if;
  perform public.ban_check();
  new.status := 'pending';
  new.first_payment_paid := false;
  new.second_payment_paid := false;
  new.total_paid := 0;
  new.total_refunded := 0;
  new.balance_used := 0;
  new.amount_due := 0;
  new.referral_reward_processed := false;
  new.referral_reward_amount := 0;
  new.weight_final := null;
  new.weight_actual := null;
  new.delivered_at := null;
  -- цену посчитал клиент: админ сверяет. Пометки сверки цены ставит только сервер — присланные клиентом убираем
  new.flags := coalesce((select jsonb_agg(f) from jsonb_array_elements(
                   case when jsonb_typeof(new.flags) = 'array' then new.flags else '[]'::jsonb end) f
                 where not (f #>> '{}' = 'price_mismatch' or f #>> '{}' like 'price:%')), '[]'::jsonb)
               || '["client_priced"]'::jsonb;
  if new.auto_cancel_reason is distinct from 'family_approval_pending' then
    new.auto_cancel_reason := null;
  end if;
  -- ICE BONUS: бонусы в заказе проверяет сервер, списывает order_pay на первой оплате.
  -- Заказ члена семьи оплачивает глава через family_approve_order (там бонусы не списываются) — бонусов в нём быть не может.
  if coalesce(new.ice_bonus_n, 0) > 0 and new.auto_cancel_reason is distinct from 'family_approval_pending' then
    select c.o_n, c.o_discount into new.ice_bonus_n, new.ice_bonus_discount
      from public._ice_bonus_order_check(new.user_id, new.ice_bonus_n, new.ice_bonus_discount, new.commission_byn, new.total_byn) c;
  else
    new.ice_bonus_n := 0;
    new.ice_bonus_discount := 0;
  end if;
  -- промокод: действующий и в рамках лимита; скидка не больше допустимой.
  -- Потолок процентного кода считается от суммы до бонусной скидки (код и бонусы складываются, а не мешают друг другу)
  if nullif(trim(coalesce(new.promo_code, '')), '') is null then
    new.promo_code := null;
    new.discount_applied := 0;
  else
    select c.o_code, c.o_discount into new.promo_code, new.discount_applied
      from public._promo_order_check(new.promo_code, coalesce(new.total_byn, 0) + new.ice_bonus_discount, new.discount_applied) c;
  end if;
  new.ice_bonus_spent_at := null;
  -- сверка цены с формулой (после бонусов и промокода): только пометка, заказ не блокируется
  v_r := public._order_price_check(new);
  if cardinality(v_r) > 0 then
    new.flags := new.flags || '["price_mismatch"]'::jsonb
      || (select jsonb_agg('price:' || x) from unnest(v_r) x);
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_event_orders()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_title text := coalesce(nullif(new.title_translated, ''), nullif(new.title, ''), nullif(new.title_original, ''));
begin
  if tg_op = 'INSERT' then
    insert into public.admin_events (topic, kind, payload)
    values ('orders', 'order_new', jsonb_build_object(
      'order_id', new.id, 'user_id', new.user_id, 'title', v_title, 'status', new.status,
      'total', coalesce(new.total_byn, new.total_final, new.price_byn),
      'delivery_method', new.delivery_method, 'payment_method', new.payment_method));
    -- цена не сошлась с формулой (пометил orders_guard)
    if jsonb_typeof(new.flags) = 'array' and new.flags ? 'price_mismatch' then
      insert into public.admin_events (topic, kind, payload)
      values ('alerts', 'price_mismatch', jsonb_build_object(
        'order_id', new.id, 'user_id', new.user_id, 'title', v_title,
        'total', coalesce(new.total_byn, new.total_final, new.price_byn),
        'reasons', coalesce((select jsonb_agg(substr(f, 7)) from jsonb_array_elements_text(new.flags) f
                             where f like 'price:%'), '[]'::jsonb)));
    end if;
    return new;
  end if;

  if new.status is distinct from old.status and new.status is not null and new.status <> 'deleted' then
    insert into public.admin_events (topic, kind, payload, not_before)
    values ('orders', 'order_status', jsonb_build_object(
      'order_id', new.id, 'user_id', new.user_id, 'title', v_title, 'status', new.status, 'old_status', old.status),
      now() + interval '1 minute');
  end if;

  if new.weight_actual is distinct from old.weight_actual
     and coalesce(new.weight_estimated, 0) > 0 and new.weight_actual is not null
     and new.weight_actual - new.weight_estimated > greatest(0.3, new.weight_estimated * 0.2) then
    insert into public.admin_events (topic, kind, payload, dedupe_key)
    values ('alerts', 'weight', jsonb_build_object(
      'order_id', new.id, 'user_id', new.user_id, 'title', v_title,
      'estimated', new.weight_estimated, 'actual', new.weight_actual),
      'weight:' || new.id || ':' || new.weight_actual)
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$function$;

revoke all on function public._order_price_check(public.orders) from public, anon;
grant execute on function public._order_price_check(public.orders) to authenticated, service_role;
grant execute on function public._jnum(jsonb) to authenticated, service_role;
