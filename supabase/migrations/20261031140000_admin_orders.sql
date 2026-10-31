-- Новая админка, этап 2 «Заказы» (ADMIN_PLAN.md): все шаги заказа и деньги по нему — на сервере.
-- Путь заказа: paid → bought → on_sklad_cn → in_transit → awaiting_payment → paid_second → in_belarus → delivered.
-- Каждая функция проверяет права и текущий статус, пишет order_events и admin_logs. Деньги — только через wallet_move.
-- Откат: supabase/rollback/20261031140000_admin_orders_rollback.sql

-- ── 1. Клиент не может закрыть второй этап, пока сумма не выставлена ──
create or replace function public.order_pay(p_order_id uuid, p_stage text default 'FIRST', p_use_balance numeric default 0, p_method text default 'manual') returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  o public.orders;
  v_due numeric;
  v_from_balance numeric := 0;
  v_balance numeric;
  v_rest numeric;
  v_payment uuid;
  v_type text;
begin
  if p_stage not in ('FIRST', 'SECOND') then
    raise exception 'Неизвестный этап оплаты';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id is distinct from v_uid then
    raise exception 'Заказ не найден';
  end if;
  if o.status = 'cancelled' then
    raise exception 'Заказ отменён';
  end if;
  if o.auto_cancel_reason = 'family_approval_pending' then
    raise exception 'Этот заказ оплатит глава семейного бюджета';
  end if;
  if p_stage = 'FIRST' and o.first_payment_paid then
    return jsonb_build_object('status', 'paid', 'already', true);
  end if;
  if p_stage = 'SECOND' and (not o.first_payment_paid or o.second_payment_paid or o.status <> 'awaiting_payment' or coalesce(o.amount_due, 0) <= 0) then
    raise exception 'Второй платёж сейчас не нужен';
  end if;

  v_due := public.order_stage_due(o, p_stage);
  select ices_balance into v_balance from public.users where user_id = v_uid for update;
  v_from_balance := least(greatest(round(coalesce(p_use_balance, 0), 2), 0), v_due, coalesce(v_balance, 0));

  if v_from_balance > 0 then
    perform public.wallet_move(v_uid, v_from_balance, 'DEBIT', 'USED_FOR_ORDER', 'ORDER_PAYMENT', o.id, null,
                               'order:' || o.id || ':' || p_stage || ':' || gen_random_uuid());
    update public.orders
       set total_paid = coalesce(total_paid, 0) + v_from_balance,
           balance_used = coalesce(balance_used, 0) + v_from_balance,
           amount_due = case when p_stage = 'SECOND' then greatest(coalesce(amount_due, 0) - v_from_balance, 0) else amount_due end,
           updated_at = now()
     where id = o.id;
    perform public.order_event(o.id, 'BALANCE_USED', 'CLIENT', jsonb_build_object('stage', p_stage, 'amount', v_from_balance));
  end if;

  v_rest := round(v_due - v_from_balance, 2);
  if v_rest <= 0 then
    perform public.order_close_stage_if_paid(o.id, p_stage);
    select ices_balance into v_balance from public.users where user_id = v_uid;
    return jsonb_build_object('status', 'paid', 'from_balance', v_from_balance, 'balance', v_balance);
  end if;

  -- Остаток: заявка на оплату. Старая неоплаченная заявка по этому этапу отменяется.
  v_type := case when p_stage = 'FIRST' then 'FIRST_PAYMENT' else 'SECOND_PAYMENT' end;
  update public.payments set status = 'CANCELLED'
   where order_id = o.id and type = v_type and status in ('CREATED', 'PENDING');
  insert into public.payments (order_id, user_id, type, method, amount, status, provider, created_by, expires_at)
  values (o.id, v_uid, v_type, case when p_method in ('manual', 'erip', 'oplati', 'card', 'card_token') then p_method else 'manual' end,
          v_rest, 'PENDING', 'manual', v_uid, now() + interval '3 days')
  returning id into v_payment;
  select ices_balance into v_balance from public.users where user_id = v_uid;
  return jsonb_build_object('status', 'pending', 'payment_id', v_payment, 'remaining', v_rest,
                            'from_balance', v_from_balance, 'balance', v_balance);
end $$;

-- ── 2. Решение клиента о подорожании: новая цена и доплата применяются при согласии ──
create or replace function public.order_price_decision(p_order_id uuid, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  o public.orders;
  v_refund numeric;
  v_bal numeric;
  v_extra numeric;
  v_pur public.purchases;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id is distinct from v_uid then
    raise exception 'Заказ не найден';
  end if;
  if o.status <> 'awaiting_decision' then
    raise exception 'Заказ не ждёт решения';
  end if;
  select * into v_pur from public.purchases
   where order_id = o.id and status = 'PRICE_INCREASE_PROPOSED' order by created_at desc limit 1;
  if p_accept then
    v_extra := round(coalesce(o.additional_payment_required, 0), 2);
    update public.orders
       set status = 'paid',
           price_cny = coalesce(v_pur.price_cny, price_cny),
           price_byn = coalesce(price_byn, 0) + v_extra,
           total_byn = coalesce(total_byn, 0) + v_extra,
           amount_due = coalesce(amount_due, 0) + v_extra,
           additional_payment_required = null,
           updated_at = now()
     where id = o.id;
    update public.purchases set status = 'PRICE_INCREASE_ACCEPTED' where id = v_pur.id;
    perform public.order_event(o.id, 'PRICE_INCREASE_ACCEPTED', 'CLIENT', jsonb_build_object('extra', v_extra));
    return jsonb_build_object('status', 'paid', 'extra', v_extra);
  end if;
  v_refund := round(coalesce(o.total_paid, 0) - coalesce(o.total_refunded, 0), 2);
  if v_refund > 0 then
    v_bal := public.wallet_move(v_uid, v_refund, 'CREDIT', 'REFUND_TO_BALANCE', 'REFUND', o.id, null, 'refund:' || o.id);
    insert into public.refunds (order_id, user_id, amount, destination, status, reason, created_by, completed_at)
    values (o.id, v_uid, v_refund, 'BALANCE', 'COMPLETED', 'Отмена из-за подорожания товара', v_uid, now());
  end if;
  update public.orders
     set status = 'cancelled', total_refunded = coalesce(total_refunded, 0) + coalesce(v_refund, 0),
         additional_payment_required = null, updated_at = now()
   where id = o.id;
  update public.purchases set status = 'PRICE_INCREASE_DECLINED' where id = v_pur.id;
  perform public.order_event(o.id, 'CANCELLED_PRICE_INCREASE', 'CLIENT', jsonb_build_object('refund', v_refund));
  return jsonb_build_object('status', 'cancelled', 'refund', coalesce(v_refund, 0), 'balance', v_bal);
end $$;

-- ── 3. Шаг «Выкуплен» ──
-- Цена в юанях сравнивается с ценой заказа, только если заказ оформлен в юанях (у товаров каталога цена для клиента фиксированная).
create or replace function public.admin_order_purchase(p_order uuid, p_platform_order text, p_price_cny numeric, p_fee_cny numeric default 0, p_comment text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  o public.orders;
  v_price numeric := round(coalesce(p_price_cny, 0), 2);
  v_fee numeric := round(greatest(coalesce(p_fee_cny, 0), 0), 2);
  v_rate numeric;
  v_plan numeric;
  v_threshold numeric := public.fin_config('price_change_small_percent', 3);
  v_compare boolean;
  v_pct numeric := 0;
  v_diff numeric := 0;
  v_result text := 'bought';
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Заказ не найден'; end if;
  if o.status <> 'paid' or not coalesce(o.first_payment_paid, false) then
    raise exception 'Выкуп записывается только для оплаченного заказа';
  end if;
  if v_price <= 0 then raise exception 'Укажите цену выкупа в юанях'; end if;

  v_rate := coalesce(nullif(o.calculated_exchange_rate, 0), nullif(o.cny_rate, 0));
  v_plan := o.price_cny;
  v_compare := upper(coalesce(o.product_currency, '')) = 'CNY' and coalesce(v_plan, 0) > 0 and v_rate is not null;
  if v_compare then
    v_pct := round((v_price - v_plan) / v_plan * 100, 2);
    v_diff := round((v_price - v_plan) * v_rate, 2);
  end if;

  if v_compare and v_pct > v_threshold then
    -- Дорого: не выкупаем, спрашиваем клиента. Цена применится при согласии (order_price_decision)
    insert into public.purchases (order_id, platform, pinduoduo_order_id, price_cny, service_fee_cny, actual_paid_cny, operator_id, status)
    values (o.id, 'PINDUODUO', trim(coalesce(p_platform_order, '')), v_price, v_fee, v_price + v_fee, v_me, 'PRICE_INCREASE_PROPOSED');
    update public.orders set status = 'awaiting_decision', additional_payment_required = v_diff, updated_at = now() where id = o.id;
    v_result := 'decision';
  else
    if coalesce(trim(p_platform_order), '') = '' then raise exception 'Укажите номер заказа на площадке'; end if;
    insert into public.purchases (order_id, platform, pinduoduo_order_id, price_cny, service_fee_cny, actual_paid_cny, purchase_datetime, operator_id, status)
    values (o.id, 'PINDUODUO', trim(p_platform_order), v_price, v_fee, v_price + v_fee, now(), v_me, 'BOUGHT');
    if v_diff > 0 then
      -- Подорожание в пределах порога: разница уходит во второй платёж
      update public.orders
         set status = 'bought', price_byn = coalesce(price_byn, 0) + v_diff, total_byn = coalesce(total_byn, 0) + v_diff,
             amount_due = coalesce(amount_due, 0) + v_diff, updated_at = now()
       where id = o.id;
      v_result := 'bought_extra';
    elsif v_diff < 0 then
      -- Подешевело: разница сразу на баланс клиента
      perform public.wallet_move(o.user_id, abs(v_diff), 'CREDIT', 'PRICE_DROP_REFUND', 'REFUND', o.id, null, 'price_drop:' || o.id);
      insert into public.refunds (order_id, user_id, amount, destination, status, reason, created_by, completed_at)
      values (o.id, o.user_id, abs(v_diff), 'BALANCE', 'COMPLETED', 'Товар оказался дешевле', v_me, now());
      update public.orders
         set status = 'bought', price_byn = greatest(coalesce(price_byn, 0) + v_diff, 0), total_byn = greatest(coalesce(total_byn, 0) + v_diff, 0),
             total_refunded = coalesce(total_refunded, 0) + abs(v_diff), updated_at = now()
       where id = o.id;
      v_result := 'bought_refund';
    else
      update public.orders set status = 'bought', updated_at = now() where id = o.id;
    end if;
  end if;

  perform public.order_event(o.id, case when v_result = 'decision' then 'PRICE_INCREASE_PROPOSED' else 'PURCHASE_RECORDED' end, 'OPERATOR',
    jsonb_build_object('price_cny', v_price, 'fee_cny', v_fee, 'plan_cny', v_plan, 'percent', v_pct, 'diff', v_diff, 'platform_order', p_platform_order), p_comment);
  perform public.admin_log('order_purchase', 'order', o.id::text, jsonb_build_object('result', v_result, 'price_cny', v_price, 'diff', v_diff));
  return jsonb_build_object('result', v_result, 'diff', v_diff, 'percent', v_pct, 'compared', v_compare);
end $$;

-- ── 4. Шаг «Вес и доставка»: считает и выставляет второй платёж ──
create or replace function public.admin_order_weigh(p_order uuid, p_weight numeric, p_delivery numeric, p_local numeric default 0, p_extra numeric default 0, p_comment text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  o public.orders;
  v_weight numeric := round(coalesce(p_weight, 0), 3);
  v_delivery numeric := round(coalesce(p_delivery, 0), 2);
  v_local numeric := round(greatest(coalesce(p_local, 0), 0), 2);
  v_extra numeric := round(greatest(coalesce(p_extra, 0), 0), 2);
  v_reserve numeric;
  v_remainder numeric;
  v_surplus numeric;
  v_insurance numeric := 0;
  v_carried numeric;
  v_second numeric;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Заказ не найден'; end if;
  if o.status not in ('bought', 'on_sklad_cn', 'in_transit') then
    raise exception 'Вес и доставку можно записать после выкупа и до прибытия в Беларусь';
  end if;
  if exists (select 1 from public.shipping_actuals where order_id = o.id) then
    raise exception 'Вес и доставка по этому заказу уже записаны. Сумму доплаты можно поправить отдельно';
  end if;
  if v_weight <= 0 then raise exception 'Укажите фактический вес'; end if;
  if v_delivery <= 0 then raise exception 'Укажите стоимость доставки'; end if;

  v_reserve := coalesce(o.delivery_reserve_amount, 0);
  v_remainder := greatest(v_delivery - v_reserve, 0);
  v_surplus := greatest(v_reserve - v_delivery, 0);
  if coalesce(o.insurance_enabled, false) then
    v_insurance := round(v_delivery * public.fin_config('insurance_rate', 0.02), 2);
  end if;
  v_carried := coalesce(o.amount_due, 0);  -- подорожание товара в пределах порога
  v_second := round(v_remainder + v_insurance + v_local + v_extra + v_carried, 2);

  insert into public.shipping_actuals (order_id, actual_weight, actual_delivery_amount, source, confirmed_at)
  values (o.id, v_weight, v_delivery, 'OPERATOR', now());

  if v_surplus > 0 then
    perform public.wallet_move(o.user_id, v_surplus, 'CREDIT', 'DELIVERY_SURPLUS', 'REFUND', o.id, null, 'delivery_surplus:' || o.id);
    insert into public.refunds (order_id, user_id, amount, destination, status, reason, created_by, completed_at)
    values (o.id, o.user_id, v_surplus, 'BALANCE', 'COMPLETED', 'Доставка дешевле резерва', v_me, now());
  end if;

  update public.orders
     set weight_actual = v_weight, weight_final = v_weight,
         delivery_cost_final = v_delivery, shipping_cost_final = v_delivery,
         second_payment_amount = v_second, amount_due = v_second,
         total_refunded = coalesce(total_refunded, 0) + v_surplus,
         total_final = round(coalesce(total_paid, 0) + v_second - coalesce(total_refunded, 0) - v_surplus, 2),
         total_byn = round(coalesce(total_paid, 0) + v_second - coalesce(total_refunded, 0) - v_surplus, 2),
         second_payment_paid = case when v_second <= 0 then true else second_payment_paid end,
         second_payment_snapshot = jsonb_build_object('delivery', v_delivery, 'reserve', v_reserve, 'remainder', v_remainder, 'surplus', v_surplus,
                                                      'insurance', v_insurance, 'local', v_local, 'extra', v_extra, 'price_diff', v_carried, 'total', v_second),
         status = case when v_second > 0 then 'awaiting_payment' else status end,
         updated_at = now()
   where id = o.id;

  perform public.order_event(o.id, 'WAREHOUSE_ARRIVED', 'OPERATOR',
    jsonb_build_object('weight', v_weight, 'delivery', v_delivery, 'second', v_second, 'surplus', v_surplus), p_comment);
  perform public.admin_log('order_weigh', 'order', o.id::text, jsonb_build_object('weight', v_weight, 'delivery', v_delivery, 'second', v_second, 'surplus', v_surplus));
  return jsonb_build_object('second', v_second, 'surplus', v_surplus, 'insurance', v_insurance, 'status', case when v_second > 0 then 'awaiting_payment' else o.status end);
end $$;

-- ── 5. Простые шаги пути ──
create or replace function public.admin_order_advance(p_order uuid, p_to text, p_track text default null, p_comment text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  o public.orders;
  v_track text := nullif(trim(coalesce(p_track, '')), '');
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Заказ не найден'; end if;

  if not (
    (o.status = 'bought' and p_to = 'on_sklad_cn') or
    (o.status = 'on_sklad_cn' and p_to = 'in_transit') or
    (o.status = 'paid_second' and p_to = 'in_transit') or  -- взвесили ещё в Китае и клиент уже доплатил
    (o.status in ('in_transit', 'paid_second') and p_to = 'in_belarus') or
    (o.status = 'in_belarus' and p_to = 'delivered')
  ) then
    raise exception 'Этот шаг сейчас недоступен: заказ уже на другом этапе';
  end if;
  if p_to = 'in_belarus' and o.status = 'in_transit'
     and not exists (select 1 from public.shipping_actuals where order_id = o.id) then
    raise exception 'Сначала запишите вес и доставку: от них зависит второй платёж';
  end if;
  if p_to in ('in_belarus', 'delivered') and coalesce(o.amount_due, 0) > 0 then
    raise exception 'Клиент ещё не оплатил доставку';
  end if;

  update public.orders
     set status = p_to,
         tracking_number_cn = case when p_to = 'on_sklad_cn' then coalesce(v_track, tracking_number_cn) else tracking_number_cn end,
         tracking_number_intl = case when p_to = 'in_transit' then coalesce(v_track, tracking_number_intl) else tracking_number_intl end,
         delivered_at = case when p_to = 'delivered' then now() else delivered_at end,
         completed_at = case when p_to = 'delivered' then now() else completed_at end,
         updated_at = now()
   where id = o.id;
  perform public.order_event(o.id, 'STATUS_CHANGED', 'OPERATOR', jsonb_build_object('from', o.status, 'to', p_to, 'track', v_track), p_comment);
  perform public.admin_log('order_status', 'order', o.id::text, jsonb_build_object('from', o.status, 'to', p_to));
  return jsonb_build_object('status', p_to);
end $$;

-- ── 6. Трек-номера. В tracking_number_by при оформлении пишется адрес получения: его сохраняем отдельно ──
create or replace function public.admin_order_set_tracks(p_order uuid, p_cn text, p_intl text, p_by text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  v_by text := nullif(trim(coalesce(p_by, '')), '');
  v_extra jsonb;
begin
  perform public.admin_require('admin');
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Заказ не найден'; end if;
  v_extra := coalesce(o.extra_services, '{}'::jsonb);
  if o.tracking_number_by ~ '[ А-Яа-яЁё|]' and not v_extra ? 'receiving_address' then
    v_extra := v_extra || jsonb_build_object('receiving_address', o.tracking_number_by);
    if v_by = o.tracking_number_by then v_by := null; end if;
  end if;
  update public.orders
     set tracking_number_cn = nullif(trim(coalesce(p_cn, '')), ''),
         tracking_number_intl = nullif(trim(coalesce(p_intl, '')), ''),
         tracking_number_by = v_by,
         extra_services = v_extra,
         updated_at = now()
   where id = o.id;
  perform public.order_event(o.id, 'TRACKS_UPDATED', 'OPERATOR', jsonb_build_object('cn', p_cn, 'intl', p_intl, 'by', v_by));
  perform public.admin_log('order_tracks', 'order', o.id::text, jsonb_build_object('cn', p_cn, 'intl', p_intl, 'by', v_by));
  return jsonb_build_object('ok', true);
end $$;

-- ── 7. Поправить сумму доплаты (ошибка в весе или доставке) ──
create or replace function public.admin_order_set_due(p_order uuid, p_amount numeric, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  v_amount numeric := round(coalesce(p_amount, -1), 2);
begin
  perform public.admin_require('admin');
  if v_amount < 0 then raise exception 'Укажите сумму'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Укажите причину'; end if;
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Заказ не найден'; end if;
  if o.status <> 'awaiting_payment' then raise exception 'Сумму можно поправить, пока заказ ждёт доплату'; end if;
  update public.orders
     set amount_due = v_amount, second_payment_amount = v_amount,
         total_byn = round(coalesce(total_byn, 0) - coalesce(amount_due, 0) + v_amount, 2),
         total_final = round(coalesce(total_final, total_byn, 0) - coalesce(amount_due, 0) + v_amount, 2),
         updated_at = now()
   where id = o.id;
  update public.payments set status = 'CANCELLED' where order_id = o.id and type = 'SECOND_PAYMENT' and status in ('CREATED', 'PENDING');
  perform public.order_event(o.id, 'SECOND_PAYMENT_CHANGED', 'OPERATOR', jsonb_build_object('from', o.amount_due, 'to', v_amount), p_reason);
  perform public.admin_log('order_set_due', 'order', o.id::text, jsonb_build_object('from', o.amount_due, 'to', v_amount, 'reason', p_reason));
  if v_amount = 0 then perform public.order_close_stage_if_paid(o.id, 'SECOND'); end if;
  return jsonb_build_object('amount_due', v_amount);
end $$;

-- ── 8. Отмена с возвратом на баланс ──
create or replace function public.admin_order_cancel(p_order uuid, p_reason text, p_refund numeric default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  o public.orders;
  v_max numeric;
  v_refund numeric;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'Укажите причину отмены'; end if;
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Заказ не найден'; end if;
  if o.status in ('cancelled', 'delivered') then raise exception 'Этот заказ отменить нельзя'; end if;

  v_max := greatest(round(coalesce(o.total_paid, 0) - coalesce(o.total_refunded, 0), 2), 0);
  v_refund := round(coalesce(p_refund, v_max), 2);
  if v_refund < 0 or v_refund > v_max then
    raise exception 'Вернуть можно не больше %', v_max;
  end if;

  update public.payments set status = 'CANCELLED' where order_id = o.id and status in ('CREATED', 'PENDING');
  if v_refund > 0 then
    perform public.wallet_move(o.user_id, v_refund, 'CREDIT', 'REFUND_TO_BALANCE', 'REFUND', o.id, null, 'refund:' || o.id);
    insert into public.refunds (order_id, user_id, amount, destination, status, reason, created_by, completed_at)
    values (o.id, o.user_id, v_refund, 'BALANCE', 'COMPLETED', trim(p_reason), v_me, now());
  end if;
  update public.orders
     set status = 'cancelled', amount_due = 0, additional_payment_required = null, auto_cancel_reason = trim(p_reason),
         total_refunded = coalesce(total_refunded, 0) + v_refund, updated_at = now()
   where id = o.id;
  perform public.order_event(o.id, 'CANCELLED_BY_OPERATOR', 'OPERATOR', jsonb_build_object('refund', v_refund, 'from', o.status), trim(p_reason));
  perform public.admin_log('order_cancel', 'order', o.id::text, jsonb_build_object('refund', v_refund, 'reason', trim(p_reason), 'from', o.status));
  return jsonb_build_object('refund', v_refund);
end $$;

-- ── 9. Архив: только завершённые и неоплаченные ──
create or replace function public.admin_order_archive(p_order uuid, p_archive boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  perform public.admin_require('admin');
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Заказ не найден'; end if;
  if p_archive and o.status not in ('delivered', 'cancelled')
     and not (o.status = 'pending' and coalesce(o.total_paid, 0) = 0) then
    raise exception 'В архив можно убрать завершённый, отменённый или неоплаченный заказ';
  end if;
  update public.orders set archived_at = case when p_archive then now() else null end, updated_at = now() where id = o.id;
  perform public.admin_log(case when p_archive then 'order_archive' else 'order_restore' end, 'order', o.id::text, '{}'::jsonb);
  return jsonb_build_object('archived', p_archive);
end $$;

-- ── 10. Ручная правка статуса: только владелец, с причиной, деньги не двигает ──
create or replace function public.admin_order_force_status(p_order uuid, p_status text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  perform public.admin_require('owner');
  if coalesce(trim(p_reason), '') = '' then raise exception 'Укажите причину'; end if;
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Заказ не найден'; end if;
  update public.orders set status = p_status, updated_at = now() where id = o.id;
  perform public.order_event(o.id, 'STATUS_FORCED', 'OPERATOR', jsonb_build_object('from', o.status, 'to', p_status), trim(p_reason));
  perform public.admin_log('order_force_status', 'order', o.id::text, jsonb_build_object('from', o.status, 'to', p_status, 'reason', trim(p_reason)));
  return jsonb_build_object('status', p_status);
end $$;

-- ── 11. Список заказов с поиском и счётчиками этапов ──
create or replace function public.admin_orders_list(p_stage text default 'work', p_search text default null, p_limit integer default 20, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_q text := nullif(trim(coalesce(p_search, '')), '');
  v_like text;
  v_rows jsonb;
  v_total integer;
  v_counts jsonb;
begin
  perform public.admin_require('admin');
  v_like := '%' || replace(replace(replace(ltrim(coalesce(v_q, ''), '#@'), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  with base as (
    select o.*, u.full_name as u_name, u.username as u_nick, u.is_toxic as u_toxic
      from public.orders o left join public.users u on u.user_id = o.user_id
     where v_q is null
        or o.id::text ilike v_like or o.user_id::text ilike v_like
        or u.full_name ilike v_like or u.username ilike v_like
        or o.tracking_number_cn ilike v_like or o.tracking_number_intl ilike v_like or o.tracking_number_by ilike v_like
        or o.title ilike v_like or o.title_translated ilike v_like or o.items::text ilike v_like
  ), staged as (
    select b.*, case
        when b.archived_at is not null then 'archive'
        when b.status = 'pending' then 'unpaid'
        when b.status = 'delivered' then 'delivered'
        when b.status = 'cancelled' then 'cancelled'
        else b.status end as stage
      from base b
  ), picked as (
    select * from staged s
     where case p_stage
             when 'all' then true
             when 'work' then s.stage not in ('archive', 'unpaid', 'delivered', 'cancelled')
             else s.stage = p_stage end
  )
  select
    (select count(*) from picked),
    (select coalesce(jsonb_object_agg(stage, n), '{}'::jsonb) from (select stage, count(*) n from staged group by stage) c),
    (select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'status', p.status, 'user_id', p.user_id, 'name', p.u_name, 'nick', p.u_nick, 'toxic', p.u_toxic,
        'title', coalesce(nullif(p.title_translated, ''), nullif(p.title, ''), nullif(p.title_original, ''), p.items -> 0 ->> 'title'),
        'image', coalesce(p.items -> 0 ->> 'image_url', p.items -> 0 ->> 'imageUrl', p.items -> 0 ->> 'image'),
        'count', coalesce(jsonb_array_length(case when jsonb_typeof(p.items) = 'array' then p.items end), 0),
        'total', coalesce(p.total_byn, p.total_final, p.price_byn), 'due', p.amount_due,
        'flags', p.flags, 'created_at', p.created_at, 'updated_at', coalesce(p.updated_at, p.created_at), 'archived', p.archived_at is not null
      ) order by p.created_at desc), '[]'::jsonb)
      from (select * from picked order by created_at desc limit greatest(least(coalesce(p_limit, 20), 50), 1) offset greatest(coalesce(p_offset, 0), 0)) p)
  into v_total, v_counts, v_rows;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'counts', v_counts);
end $$;

-- ── 12. Карточка заказа одним запросом ──
create or replace function public.admin_order_card(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  o public.orders;
  v_user jsonb;
begin
  perform public.admin_require('admin');
  select * into o from public.orders where id = p_order;
  if not found then raise exception 'Заказ не найден'; end if;
  select jsonb_build_object('user_id', u.user_id, 'name', u.full_name, 'nick', u.username, 'phone', u.phone, 'balance', u.ices_balance,
                            'trusted', u.is_trusted, 'toxic', u.is_toxic, 'banned', u.is_banned, 'kyc', u.kyc_status,
                            'orders', (select count(*) from public.orders x where x.user_id = u.user_id))
    into v_user from public.users u where u.user_id = o.user_id;
  return jsonb_build_object(
    'order', to_jsonb(o),
    'user', v_user,
    'payments', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'type', p.type, 'method', p.method, 'amount', p.amount, 'status', p.status,
                   'created_at', p.created_at, 'paid_at', p.paid_at) order by p.created_at desc), '[]'::jsonb) from public.payments p where p.order_id = o.id),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('type', e.event_type, 'actor', e.actor_type, 'actor_id', e.actor_id, 'value', e.new_value,
                   'comment', e.comment, 'at', e.created_at) order by e.created_at desc), '[]'::jsonb) from public.order_events e where e.order_id = o.id),
    'purchases', (select coalesce(jsonb_agg(jsonb_build_object('platform_order', p.pinduoduo_order_id, 'price_cny', p.price_cny, 'fee_cny', p.service_fee_cny,
                   'status', p.status, 'at', p.created_at) order by p.created_at desc), '[]'::jsonb) from public.purchases p where p.order_id = o.id),
    'shipping', (select coalesce(jsonb_agg(jsonb_build_object('weight', s.actual_weight, 'delivery', s.actual_delivery_amount, 'at', s.created_at)), '[]'::jsonb) from public.shipping_actuals s where s.order_id = o.id),
    'refunds', (select coalesce(jsonb_agg(jsonb_build_object('amount', r.amount, 'reason', r.reason, 'status', r.status, 'at', r.created_at) order by r.created_at desc), '[]'::jsonb) from public.refunds r where r.order_id = o.id),
    'messages', (select count(*) from public.order_messages m where m.order_id = o.id),
    'config', jsonb_build_object('threshold', public.fin_config('price_change_small_percent', 3), 'insurance_rate', public.fin_config('insurance_rate', 0.02),
                                 'duoduo', (select value from public.financial_configs where key = 'duoduo_fee_rule')),
    'me', jsonb_build_object('owner', public.app_is_owner())
  );
end $$;

revoke all on function
  public.admin_order_purchase(uuid, text, numeric, numeric, text), public.admin_order_weigh(uuid, numeric, numeric, numeric, numeric, text),
  public.admin_order_advance(uuid, text, text, text), public.admin_order_set_tracks(uuid, text, text, text),
  public.admin_order_set_due(uuid, numeric, text), public.admin_order_cancel(uuid, text, numeric), public.admin_order_archive(uuid, boolean),
  public.admin_order_force_status(uuid, text, text), public.admin_orders_list(text, text, integer, integer), public.admin_order_card(uuid)
  from public, anon;
grant execute on function
  public.admin_order_purchase(uuid, text, numeric, numeric, text), public.admin_order_weigh(uuid, numeric, numeric, numeric, numeric, text),
  public.admin_order_advance(uuid, text, text, text), public.admin_order_set_tracks(uuid, text, text, text),
  public.admin_order_set_due(uuid, numeric, text), public.admin_order_cancel(uuid, text, numeric), public.admin_order_archive(uuid, boolean),
  public.admin_order_force_status(uuid, text, text), public.admin_orders_list(text, text, integer, integer), public.admin_order_card(uuid)
  to authenticated;
