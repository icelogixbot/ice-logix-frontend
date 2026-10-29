-- Деньги только через сервер: функции базы для всех действий, где меняется баланс или статус оплаты.
-- Приложение вызывает их через supabaseClient.rpc(...). Цены берутся из базы, а не с кнопки на экране.
-- Все функции SECURITY DEFINER, проверяют вошедшего пользователя (app_uid) и права.
-- Статусы заказа — те, что понимает интерфейс: pending -> paid -> ... -> awaiting_payment -> paid_second.

-- ---------------------------------------------------------------------------
-- Общие внутренние функции (клиенту недоступны)
-- ---------------------------------------------------------------------------
create or replace function public.app_require_uid() returns bigint
language plpgsql stable security definer set search_path = public as $$
declare v bigint := public.app_uid();
begin
  if v is null then
    raise exception 'Войдите в приложение' using errcode = '28000';
  end if;
  return v;
end $$;

-- Вызов пришёл от клиента (вошедший пользователь или аноним), а не от сервера.
-- Внутри SECURITY DEFINER current_user — владелец функции, поэтому смотрим на роль из токена запроса.
create or replace function public.app_is_client_call() returns boolean
language sql stable set search_path = public as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') in ('authenticated', 'anon')
$$;
grant execute on function public.app_is_client_call() to anon, authenticated;

create or replace function public.fin_config(p_key text, p_default numeric) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::numeric from public.financial_configs where key = p_key), p_default)
$$;

-- Движение по балансу: только через журнал. p_source — ключ идемпотентности (повтор не спишет дважды).
create or replace function public.wallet_move(
  p_user bigint, p_amount numeric, p_direction text, p_reason text,
  p_type text default 'ADJUSTMENT', p_order uuid default null, p_payment uuid default null, p_source text default null
) returns numeric
language plpgsql security definer set search_path = public as $$
declare v_after numeric;
begin
  if p_amount is null or round(p_amount, 2) <= 0 then
    raise exception 'Сумма должна быть больше нуля';
  end if;
  insert into public.balance_entries (user_id, order_id, payment_id, type, amount, direction, reason, source_transaction_id, created_by)
  values (p_user, p_order, p_payment, p_type, round(p_amount, 2), p_direction, p_reason, p_source, public.app_uid())
  returning balance_after into v_after;
  return v_after;
end $$;

create or replace function public.order_event(p_order uuid, p_type text, p_actor_type text, p_new jsonb default null, p_comment text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.order_events (order_id, event_type, actor_type, actor_id, new_value, comment)
  values (p_order, p_type, p_actor_type, public.app_uid(), p_new, p_comment)
$$;

-- Сколько ещё нужно заплатить по этапу заказа
create or replace function public.order_stage_due(o public.orders, p_stage text) returns numeric
language sql stable set search_path = public as $$
  select case
    when p_stage = 'FIRST' then greatest(
      coalesce(nullif(o.first_payment_amount, 0), nullif(o.prepayment_amount, 0), o.total_byn, 0) - coalesce(o.total_paid, 0), 0)
    when p_stage = 'SECOND' then greatest(coalesce(o.amount_due, 0), 0)
    else 0 end
$$;

-- Отметить этап оплаченным, если долг закрыт
create or replace function public.order_close_stage_if_paid(p_order uuid, p_stage text) returns boolean
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if p_stage = 'FIRST' and not o.first_payment_paid and public.order_stage_due(o, 'FIRST') <= 0 then
    update public.orders
       set first_payment_paid = true,
           status = case when status in ('pending', 'awaiting_first_payment') then 'paid' else status end,
           auto_cancel_reason = case when auto_cancel_reason = 'family_approval_pending' then null else auto_cancel_reason end,
           updated_at = now()
     where id = p_order;
    perform public.order_event(p_order, 'FIRST_PAYMENT_PAID', 'SYSTEM', jsonb_build_object('total_paid', o.total_paid));
    -- первый оплаченный заказ даёт статус «проверенный клиент» (раньше ставил браузер)
    update public.users set is_trusted = true where user_id = o.user_id and coalesce(is_trusted, false) = false;
    return true;
  elsif p_stage = 'SECOND' and not o.second_payment_paid and public.order_stage_due(o, 'SECOND') <= 0 then
    update public.orders
       set second_payment_paid = true, amount_due = 0,
           status = case when status = 'awaiting_payment' then 'paid_second' else status end,
           updated_at = now()
     where id = p_order;
    perform public.order_event(p_order, 'SECOND_PAYMENT_PAID', 'SYSTEM', jsonb_build_object('total_paid', o.total_paid));
    return true;
  end if;
  return false;
end $$;

-- Зачесть платёж (пополнение или оплату заказа). Повторный вызов ничего не делает.
-- Вызывают: админ (подтверждение вручную), функция-вебхук платёжной системы (секретный ключ).
create or replace function public.payment_settle(p_payment_id uuid, p_provider_tx text default null, p_actor bigint default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p public.payments;
  v_stage text;
  v_bal numeric;
begin
  select * into p from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Платёж не найден';
  end if;
  if p.status = 'PAID' then
    return jsonb_build_object('ok', true, 'already', true, 'status', p.status);
  end if;
  if p.status not in ('CREATED', 'PENDING', 'REQUIRES_REVIEW') then
    raise exception 'Платёж в статусе %, зачесть нельзя', p.status;
  end if;

  update public.payments
     set status = 'PAID', paid_at = now(),
         provider_transaction_id = coalesce(p_provider_tx, provider_transaction_id),
         confirmed_by = coalesce(p_actor, confirmed_by)
   where id = p.id;

  if p.type = 'TOPUP' then
    v_bal := public.wallet_move(p.user_id, p.amount, 'CREDIT', 'TOPUP', 'TOPUP', null, p.id, 'payment:' || p.id);
  elsif p.type in ('FIRST_PAYMENT', 'SECOND_PAYMENT') and p.order_id is not null then
    v_stage := case when p.type = 'FIRST_PAYMENT' then 'FIRST' else 'SECOND' end;
    update public.orders
       set total_paid = coalesce(total_paid, 0) + p.amount,
           amount_due = case when v_stage = 'SECOND' then greatest(coalesce(amount_due, 0) - p.amount, 0) else amount_due end,
           updated_at = now()
     where id = p.order_id;
    perform public.order_event(p.order_id, 'PAYMENT_RECEIVED', case when p_actor is null then 'WEBHOOK' else 'OPERATOR' end,
                               jsonb_build_object('payment_id', p.id, 'amount', p.amount, 'method', p.method));
    perform public.order_close_stage_if_paid(p.order_id, v_stage);
  end if;
  return jsonb_build_object('ok', true, 'status', 'PAID', 'balance', v_bal);
end $$;

-- ---------------------------------------------------------------------------
-- Пополнение баланса и оплата заказа
-- ---------------------------------------------------------------------------

-- Заявка на пополнение (пока нет договора с платёжкой: «Я оплатил» -> админ подтверждает)
create or replace function public.request_topup(p_amount numeric, p_method text default 'manual')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  v_amount numeric := round(coalesce(p_amount, 0), 2);
  v_id uuid;
begin
  if v_amount < public.fin_config('topup_min', 1) or v_amount > public.fin_config('topup_max', 5000) then
    raise exception 'Сумма пополнения от % до %', public.fin_config('topup_min', 1), public.fin_config('topup_max', 5000);
  end if;
  if p_method not in ('manual', 'erip', 'oplati', 'card') then
    raise exception 'Неизвестный способ оплаты';
  end if;
  if (select count(*) from public.payments where user_id = v_uid and type = 'TOPUP' and status = 'PENDING') >= 3 then
    raise exception 'У вас уже есть три заявки на пополнение. Дождитесь проверки';
  end if;
  insert into public.payments (user_id, type, method, amount, status, provider, created_by, expires_at)
  values (v_uid, 'TOPUP', p_method, v_amount, 'PENDING', 'manual', v_uid, now() + interval '3 days')
  returning id into v_id;
  return jsonb_build_object('payment_id', v_id, 'amount', v_amount, 'status', 'PENDING');
end $$;

-- Оплата этапа заказа: сначала с баланса (сколько клиент разрешил), остаток — заявкой на оплату
create or replace function public.order_pay(p_order_id uuid, p_stage text default 'FIRST', p_use_balance numeric default 0, p_method text default 'manual')
returns jsonb language plpgsql security definer set search_path = public as $$
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
  if p_stage = 'SECOND' and (not o.first_payment_paid or o.second_payment_paid) then
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

-- Клиент отменяет свою неоплаченную заявку
create or replace function public.cancel_my_payment(p_payment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.payments set status = 'CANCELLED'
   where id = p_payment_id and user_id = public.app_require_uid() and status in ('CREATED', 'PENDING');
end $$;

-- Подорожание товара больше чем на 3%: клиент соглашается или отменяет (всё оплаченное — на баланс)
create or replace function public.order_price_decision(p_order_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  o public.orders;
  v_refund numeric;
  v_bal numeric;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id is distinct from v_uid then
    raise exception 'Заказ не найден';
  end if;
  if o.status <> 'awaiting_decision' then
    raise exception 'Заказ не ждёт решения';
  end if;
  if p_accept then
    update public.orders set status = 'paid', updated_at = now() where id = o.id;
    perform public.order_event(o.id, 'PRICE_INCREASE_ACCEPTED', 'CLIENT');
    return jsonb_build_object('status', 'paid');
  end if;
  v_refund := round(coalesce(o.total_paid, 0) - coalesce(o.total_refunded, 0), 2);
  if v_refund > 0 then
    v_bal := public.wallet_move(v_uid, v_refund, 'CREDIT', 'REFUND_TO_BALANCE', 'REFUND', o.id, null, 'refund:' || o.id);
    insert into public.refunds (order_id, user_id, amount, destination, status, reason, created_by, completed_at)
    values (o.id, v_uid, v_refund, 'BALANCE', 'COMPLETED', 'Отмена из-за подорожания товара', v_uid, now());
  end if;
  update public.orders set status = 'cancelled', total_refunded = coalesce(total_refunded, 0) + coalesce(v_refund, 0), updated_at = now()
   where id = o.id;
  perform public.order_event(o.id, 'CANCELLED_PRICE_INCREASE', 'CLIENT', jsonb_build_object('refund', v_refund));
  return jsonb_build_object('status', 'cancelled', 'refund', coalesce(v_refund, 0), 'balance', v_bal);
end $$;

-- ---------------------------------------------------------------------------
-- Админ: подтвердить / отклонить заявку на оплату
-- ---------------------------------------------------------------------------
create or replace function public.admin_confirm_payment(p_payment_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.app_is_admin() then
    raise exception 'Только для администратора' using errcode = '42501';
  end if;
  return public.payment_settle(p_payment_id, null, public.app_uid());
end $$;

create or replace function public.admin_reject_payment(p_payment_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.app_is_admin() then
    raise exception 'Только для администратора' using errcode = '42501';
  end if;
  update public.payments
     set status = 'DECLINED', failure_reason = coalesce(nullif(p_reason, ''), 'Оплата не найдена'), confirmed_by = public.app_uid()
   where id = p_payment_id and status in ('CREATED', 'PENDING', 'REQUIRES_REVIEW');
end $$;

-- ---------------------------------------------------------------------------
-- Покупки за баланс: бонусный магазин, курсы, Legit-Check
-- ---------------------------------------------------------------------------
create or replace function public.buy_bonus_item(p_item_id uuid, p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  it public.bonus_shop_items;
  v_order uuid := gen_random_uuid();
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_promo text;
  v_bal numeric;
begin
  select * into it from public.bonus_shop_items where id = p_item_id and is_active for update;
  if not found then
    raise exception 'Товар не найден или снят с продажи';
  end if;
  if it.stock = 0 then
    raise exception 'Товар закончился';
  end if;
  if it.category = 'coupons' then
    v_promo := 'ICE-REWARD-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    v_payload := v_payload || jsonb_build_object('promo_code', v_promo);
  end if;
  if it.price_ice > 0 then
    v_bal := public.wallet_move(v_uid, it.price_ice, 'DEBIT', 'BONUS_SHOP_PURCHASE', 'PURCHASE', null, null, 'bonus:' || v_order);
  end if;
  if it.stock > 0 then
    update public.bonus_shop_items set stock = stock - 1 where id = it.id;
  end if;
  insert into public.bonus_shop_orders (id, user_id, item_id, item_title, category, price_ice, contact_payload, status)
  values (v_order, v_uid, it.id, it.title, it.category, it.price_ice, v_payload, 'PENDING');
  select ices_balance into v_bal from public.users where user_id = v_uid;
  return jsonb_build_object('order_id', v_order, 'balance', v_bal, 'promo_code', v_promo);
end $$;

create or replace function public.buy_course(p_course_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  c public.courses;
  v_bal numeric;
begin
  select * into c from public.courses where id = p_course_id and coalesce(is_active, true);
  if not found then
    raise exception 'Курс не найден';
  end if;
  if exists (select 1 from public.user_courses where user_id = v_uid and course_id = c.id) then
    select ices_balance into v_bal from public.users where user_id = v_uid;
    return jsonb_build_object('already', true, 'balance', v_bal);
  end if;
  if coalesce(c.price_ice, 0) > 0 then
    perform public.wallet_move(v_uid, c.price_ice, 'DEBIT', 'COURSE_PURCHASE', 'PURCHASE', null, null, 'course:' || v_uid || ':' || c.id);
  end if;
  insert into public.user_courses (user_id, course_id) values (v_uid, c.id) on conflict do nothing;
  select ices_balance into v_bal from public.users where user_id = v_uid;
  return jsonb_build_object('ok', true, 'balance', v_bal);
end $$;

-- Сертификат курса -> «проверенный партнёр»: только если курс куплен (или бесплатный) и все уроки пройдены
create or replace function public.claim_course_certificate(p_course_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  v_price int;
  v_total int;
  v_done int;
begin
  select coalesce(price_ice, 0) into v_price from public.courses where id = p_course_id;
  if not found then
    raise exception 'Курс не найден';
  end if;
  if v_price > 0 and not exists (select 1 from public.user_courses where user_id = v_uid and course_id = p_course_id) then
    raise exception 'Сначала получите доступ к курсу';
  end if;
  select count(*) into v_total from public.lessons where course_id = p_course_id;
  select count(*) into v_done from public.user_lessons_progress p join public.lessons l on l.id = p.lesson_id
   where p.user_id = v_uid and l.course_id = p_course_id and p.is_completed;
  if v_total > 0 and v_done < v_total then
    raise exception 'Пройдите все уроки курса: осталось %', v_total - v_done;
  end if;
  update public.users set is_trusted = true where user_id = v_uid;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.pay_legit_check(p_brand text, p_model text, p_photos text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  v_cost numeric := public.fin_config('legit_check_price', 5);
  v_req uuid := gen_random_uuid();
  v_bal numeric;
begin
  if coalesce(trim(p_brand), '') = '' or coalesce(trim(p_model), '') = '' then
    raise exception 'Укажите бренд и модель';
  end if;
  if coalesce(array_length(p_photos, 1), 0) = 0 then
    raise exception 'Добавьте фото';
  end if;
  v_bal := public.wallet_move(v_uid, v_cost, 'DEBIT', 'LEGIT_CHECK', 'PURCHASE', null, null, 'legit:' || v_req);
  insert into public.legit_check_requests (id, user_id, brand, model, photos, status)
  values (v_req, v_uid, left(p_brand, 100), left(p_model, 150), p_photos[1:10], 'pending');
  insert into public.transactions (user_id, amount, type, status, description)
  values (v_uid, -v_cost, 'legit_check', 'completed', 'Оплата ручной проверки Legit-Check (' || left(p_brand, 100) || ' ' || left(p_model, 150) || ')');
  return jsonb_build_object('request_id', v_req, 'balance', v_bal, 'cost', v_cost);
end $$;

-- ---------------------------------------------------------------------------
-- Колесо удачи: приз выбирает сервер. Порядок и вес — как FORTUNE_REWARDS в app-core.js
-- ---------------------------------------------------------------------------
create or replace function public.spin_fortune_wheel() returns jsonb
language plpgsql security definer set search_path = public as $$
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
end $$;

-- Промокод: проверить один код, не показывая список всех
create or replace function public.check_promocode(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object('valid', true, 'id', id, 'code', code, 'discount_type', discount_type, 'discount_value', discount_value)
       from public.promocodes where upper(code) = upper(trim(p_code)) and coalesce(is_active, true) limit 1),
    jsonb_build_object('valid', false))
$$;

-- Общие настройки магазина, которые раньше читались из строки владельца в users
create or replace function public.get_public_config() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'buyer_vacation', coalesce(settings -> 'buyer_vacation', '{"active": false, "days": 0}'::jsonb),
    'exchange_buffer', settings -> 'exchange_buffer')
  from public.users where role = 'owner' order by user_id limit 1
$$;

-- ---------------------------------------------------------------------------
-- Семейный бюджет (раньше участник сам дописывал себя в строку главы)
-- ---------------------------------------------------------------------------
create or replace function public.family_members_of(p_head bigint) returns bigint[]
language sql stable security definer set search_path = public as $$
  select coalesce(array(select jsonb_array_elements_text(settings -> 'family' -> 'members')::bigint
                          from public.users where user_id = p_head and settings -> 'family' ->> 'role' = 'head'), '{}')
$$;

create or replace function public.family_create() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  v_fam jsonb;
begin
  select settings -> 'family' into v_fam from public.users where user_id = v_uid for update;
  if v_fam is not null and v_fam <> 'null'::jsonb and v_fam ->> 'role' is not null then
    raise exception 'Вы уже состоите в семейном бюджете';
  end if;
  v_fam := jsonb_build_object('role', 'head', 'token', 'FAM-' || upper(substr(md5(gen_random_uuid()::text), 1, 2)) || '-'
                              || upper(substr(md5(gen_random_uuid()::text), 1, 4)), 'members', '[]'::jsonb);
  update public.users set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{family}', v_fam) where user_id = v_uid;
  return v_fam;
end $$;

create or replace function public.family_join(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  v_head bigint;
  v_members jsonb;
  v_own jsonb;
begin
  select settings -> 'family' into v_own from public.users where user_id = v_uid for update;
  if v_own is not null and v_own <> 'null'::jsonb and v_own ->> 'role' is not null then
    raise exception 'Вы уже состоите в семейном бюджете';
  end if;
  select user_id, coalesce(settings -> 'family' -> 'members', '[]'::jsonb) into v_head, v_members
    from public.users
   where settings -> 'family' ->> 'role' = 'head' and upper(settings -> 'family' ->> 'token') = upper(trim(p_token))
   for update;
  if v_head is null then
    raise exception 'Семья с таким кодом не найдена';
  end if;
  if v_head = v_uid then
    raise exception 'Это ваш собственный код';
  end if;
  if jsonb_array_length(v_members) >= 10 then
    raise exception 'В семье уже 10 участников';
  end if;
  if not v_members @> to_jsonb(v_uid) then
    v_members := v_members || to_jsonb(v_uid);
  end if;
  update public.users set settings = jsonb_set(settings, '{family,members}', v_members) where user_id = v_head;
  update public.users
     set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{family}',
                              jsonb_build_object('role', 'member', 'head_id', v_head, 'token', upper(trim(p_token))))
   where user_id = v_uid;
  return jsonb_build_object('ok', true, 'head_id', v_head);
end $$;

create or replace function public.family_leave() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  v_head bigint;
begin
  select (settings -> 'family' ->> 'head_id')::bigint into v_head from public.users
   where user_id = v_uid and settings -> 'family' ->> 'role' = 'member';
  if v_head is not null then
    update public.users
       set settings = jsonb_set(settings, '{family,members}',
                                coalesce((select jsonb_agg(m) from jsonb_array_elements(settings -> 'family' -> 'members') m
                                           where m <> to_jsonb(v_uid)), '[]'::jsonb))
     where user_id = v_head and settings -> 'family' ->> 'role' = 'head';
  end if;
  update public.users set settings = coalesce(settings, '{}'::jsonb) - 'family' where user_id = v_uid;
end $$;

create or replace function public.family_remove_member(p_member bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid bigint := public.app_require_uid();
begin
  if not (public.family_members_of(v_uid) @> array[p_member]) then
    raise exception 'Такого участника нет в вашей семье';
  end if;
  update public.users
     set settings = jsonb_set(settings, '{family,members}',
                              coalesce((select jsonb_agg(m) from jsonb_array_elements(settings -> 'family' -> 'members') m
                                         where m <> to_jsonb(p_member)), '[]'::jsonb))
   where user_id = v_uid;
  update public.users set settings = settings - 'family'
   where user_id = p_member and (settings -> 'family' ->> 'head_id')::bigint = v_uid;
end $$;

create or replace function public.family_disband() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  v_members bigint[] := public.family_members_of(v_uid);
begin
  update public.users set settings = settings - 'family'
   where user_id = any (v_members) and (settings -> 'family' ->> 'head_id')::bigint = v_uid;
  update public.users set settings = coalesce(settings, '{}'::jsonb) - 'family' where user_id = v_uid;
end $$;

-- Что видит участник/глава: семья, участники (только имя и ник), заказы на одобрение
create or replace function public.family_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  v_fam jsonb;
  v_head bigint;
begin
  select settings -> 'family' into v_fam from public.users where user_id = v_uid;
  if v_fam is null or v_fam = 'null'::jsonb then
    return jsonb_build_object('family', null);
  end if;
  v_head := case when v_fam ->> 'role' = 'head' then v_uid else (v_fam ->> 'head_id')::bigint end;
  return jsonb_build_object(
    'family', v_fam,
    'head', (select jsonb_build_object('user_id', user_id, 'full_name', full_name, 'username', username)
               from public.users where user_id = v_head),
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', user_id, 'full_name', full_name, 'username', username, 'settings',
                                                              jsonb_build_object('family', settings -> 'family')))
                           from public.users where user_id = any (public.family_members_of(v_head))), '[]'::jsonb),
    'pending_orders', case when v_fam ->> 'role' = 'head' then
        coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc) from public.orders o
                   where o.user_id = any (public.family_members_of(v_uid)) and o.auto_cancel_reason = 'family_approval_pending'
                     and o.status <> 'cancelled'), '[]'::jsonb)
      else '[]'::jsonb end);
end $$;

-- Глава оплачивает заказ участника со своего баланса
create or replace function public.family_approve_order(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  o public.orders;
  v_due numeric;
  v_bal numeric;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or not (public.family_members_of(v_uid) @> array[o.user_id]) or o.auto_cancel_reason is distinct from 'family_approval_pending' then
    raise exception 'Заказ не найден';
  end if;
  v_due := public.order_stage_due(o, 'FIRST');
  if v_due > 0 then
    v_bal := public.wallet_move(v_uid, v_due, 'DEBIT', 'FAMILY_ORDER_PAYMENT', 'ORDER_PAYMENT', o.id, null, 'family:' || o.id);
    update public.orders set total_paid = coalesce(total_paid, 0) + v_due, balance_used = coalesce(balance_used, 0) + v_due
     where id = o.id;
  end if;
  update public.orders set auto_cancel_reason = null, updated_at = now() where id = o.id;
  perform public.order_event(o.id, 'FAMILY_APPROVED', 'CLIENT', jsonb_build_object('head_id', v_uid, 'amount', v_due));
  perform public.order_close_stage_if_paid(o.id, 'FIRST');
  select ices_balance into v_bal from public.users where user_id = v_uid;
  return jsonb_build_object('ok', true, 'paid', v_due, 'balance', v_bal);
end $$;

create or replace function public.family_decline_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid bigint := public.app_require_uid();
begin
  update public.orders
     set status = 'cancelled', auto_cancel_reason = 'Отклонено главой семейного бюджета', updated_at = now()
   where id = p_order_id and auto_cancel_reason = 'family_approval_pending'
     and user_id = any (public.family_members_of(v_uid));
end $$;

-- ---------------------------------------------------------------------------
-- Карта дропшиппера для выплат: шифруется в базе ключом из Vault, клиенту — только последние 4 цифры
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'ice_payout_card_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'ice_payout_card_key', 'Ключ шифрования карт выплат');
  end if;
end $$;

create or replace function public.payout_card_key() returns text
language sql stable security definer set search_path = public as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'ice_payout_card_key' limit 1
$$;

create or replace function public.save_payout_card(p_card text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  v_num text := regexp_replace(coalesce(p_card, ''), '\D', '', 'g');
  v_sum int := 0;
  v_d int;
begin
  if length(v_num) not between 13 and 19 then
    raise exception 'Номер карты должен содержать от 13 до 19 цифр';
  end if;
  for i in 1 .. length(v_num) loop      -- проверка Луна
    v_d := substr(v_num, length(v_num) - i + 1, 1)::int;
    if i % 2 = 0 then
      v_d := v_d * 2;
      if v_d > 9 then v_d := v_d - 9; end if;
    end if;
    v_sum := v_sum + v_d;
  end loop;
  if v_sum % 10 <> 0 then
    raise exception 'Проверьте номер карты';
  end if;
  update public.users
     set encrypted_card = 'v1:' || right(v_num, 4) || ':' || encode(extensions.pgp_sym_encrypt(v_num, public.payout_card_key()), 'base64')
   where user_id = v_uid;
  return jsonb_build_object('last4', right(v_num, 4));
end $$;

create or replace function public.get_payout_card() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when encrypted_card like 'v1:%' then jsonb_build_object('last4', split_part(encrypted_card, ':', 2)) else null end
    from public.users where user_id = public.app_uid()
$$;

create or replace function public.delete_payout_card() returns void
language sql security definer set search_path = public as $$
  update public.users set encrypted_card = null where user_id = public.app_uid()
$$;

create or replace function public.admin_get_payout_card(p_user_id bigint) returns text
language plpgsql stable security definer set search_path = public as $$
declare v_enc text;
begin
  if not public.app_is_admin() then
    raise exception 'Только для администратора' using errcode = '42501';
  end if;
  select encrypted_card into v_enc from public.users where user_id = p_user_id;
  if v_enc is null or v_enc not like 'v1:%' then
    return null;
  end if;
  return extensions.pgp_sym_decrypt(decode(split_part(v_enc, ':', 3), 'base64'), public.payout_card_key());
end $$;

-- Старый формат (зашифрован ключом, который лежал в коде приложения) — не используем, удаляем
update public.users set encrypted_card = null where encrypted_card is not null and encrypted_card not like 'v1:%';

-- ---------------------------------------------------------------------------
-- Паспорт: только владелец или админ (ERR-SB-005)
-- ---------------------------------------------------------------------------
create or replace function public.save_passport_secure(p_user_id bigint, p_passport text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_key_id uuid;
  v_encrypted bytea;
begin
  if p_user_id is distinct from public.app_uid() and not public.app_is_admin() and public.app_is_client_call() then
    raise exception 'Нет доступа' using errcode = '42501';
  end if;
  select id into v_key_id from pgsodium.key where name = 'passport_key' limit 1;
  if not found then
    select id into v_key_id from pgsodium.create_key(name := 'passport_key');
  end if;
  v_encrypted := pgsodium.crypto_aead_det_encrypt(convert_to(p_passport, 'utf8'), convert_to(p_user_id::text, 'utf8'), v_key_id);
  update public.users set vault_passport = encode(v_encrypted, 'base64') where user_id = p_user_id;
end $$;

create or replace function public.get_passport_secure(p_user_id bigint) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_key_id uuid;
  v_encrypted text;
begin
  if p_user_id is distinct from public.app_uid() and not public.app_is_admin() and public.app_is_client_call() then
    raise exception 'Нет доступа' using errcode = '42501';
  end if;
  select vault_passport into v_encrypted from public.users where user_id = p_user_id;
  if v_encrypted is null then
    return null;
  end if;
  select id into v_key_id from pgsodium.key where name = 'passport_key' limit 1;
  if not found then
    return null;
  end if;
  return convert_from(pgsodium.crypto_aead_det_decrypt(decode(v_encrypted, 'base64'), convert_to(p_user_id::text, 'utf8'), v_key_id), 'utf8');
exception when others then
  if sqlstate = '42501' then raise; end if;
  return null;
end $$;

-- Реферальная статистика и дерево: только своё (или админ). Раньше считалось с правами вызывающего,
-- после включения защиты таблиц дерево бы опустело. Старые функции становятся *_impl (только для сервера),
-- а под прежними именами — обёртки с проверкой.
create or replace function public.referral_guard(p_root bigint) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if p_root is distinct from public.app_uid() and not public.app_is_admin() and public.app_is_client_call() then
    raise exception 'Нет доступа' using errcode = '42501';
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.get_referral_stats_impl(bigint)') is null then
    execute 'alter function public.get_referral_stats(bigint) rename to get_referral_stats_impl';
  end if;
  if to_regprocedure('public.get_referral_tree_impl(bigint)') is null then
    execute 'alter function public.get_referral_tree(bigint) rename to get_referral_tree_impl';
  end if;
  execute 'alter function public.get_referral_stats_impl(bigint) security definer set search_path = public';
  execute 'alter function public.get_referral_tree_impl(bigint) security definer set search_path = public';
  execute 'revoke all on function public.get_referral_stats_impl(bigint), public.get_referral_tree_impl(bigint) from public, anon, authenticated';
end $$;

create or replace function public.get_referral_stats(root_id bigint)
returns table (level1_count integer, level2_count integer, level3_count integer,
               earned_l1 numeric, earned_l2 numeric, earned_l3 numeric, total_earned numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.referral_guard(root_id);
  return query select * from public.get_referral_stats_impl(root_id);
end $$;

create or replace function public.get_referral_tree(root_id bigint)
returns table (level integer, user_id bigint, full_name text, username text, referrer_id bigint,
               direct_count integer, joined_at timestamp without time zone)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.referral_guard(root_id);
  return query select * from public.get_referral_tree_impl(root_id);
end $$;

revoke all on function public.get_referral_stats(bigint), public.get_referral_tree(bigint) from public, anon;
grant execute on function public.get_referral_stats(bigint), public.get_referral_tree(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Кто что может вызывать
-- ---------------------------------------------------------------------------
revoke all on function
  public.app_require_uid(), public.fin_config(text, numeric),
  public.wallet_move(bigint, numeric, text, text, text, uuid, uuid, text),
  public.order_event(uuid, text, text, jsonb, text), public.order_stage_due(public.orders, text),
  public.order_close_stage_if_paid(uuid, text), public.payment_settle(uuid, text, bigint),
  public.family_members_of(bigint), public.payout_card_key()
from public, anon, authenticated;
grant execute on function public.payment_settle(uuid, text, bigint) to service_role;

revoke all on function
  public.request_topup(numeric, text), public.order_pay(uuid, text, numeric, text), public.cancel_my_payment(uuid),
  public.order_price_decision(uuid, boolean), public.admin_confirm_payment(uuid), public.admin_reject_payment(uuid, text),
  public.buy_bonus_item(uuid, jsonb), public.buy_course(uuid), public.claim_course_certificate(uuid),
  public.pay_legit_check(text, text, text[]), public.spin_fortune_wheel(), public.check_promocode(text),
  public.family_create(), public.family_join(text), public.family_leave(), public.family_remove_member(bigint),
  public.family_disband(), public.family_overview(), public.family_approve_order(uuid), public.family_decline_order(uuid),
  public.save_payout_card(text), public.get_payout_card(), public.delete_payout_card(), public.admin_get_payout_card(bigint),
  public.save_passport_secure(bigint, text), public.get_passport_secure(bigint), public.referral_guard(bigint)
from public, anon;
grant execute on function
  public.request_topup(numeric, text), public.order_pay(uuid, text, numeric, text), public.cancel_my_payment(uuid),
  public.order_price_decision(uuid, boolean), public.admin_confirm_payment(uuid), public.admin_reject_payment(uuid, text),
  public.buy_bonus_item(uuid, jsonb), public.buy_course(uuid), public.claim_course_certificate(uuid),
  public.pay_legit_check(text, text, text[]), public.spin_fortune_wheel(), public.check_promocode(text),
  public.family_create(), public.family_join(text), public.family_leave(), public.family_remove_member(bigint),
  public.family_disband(), public.family_overview(), public.family_approve_order(uuid), public.family_decline_order(uuid),
  public.save_payout_card(text), public.get_payout_card(), public.delete_payout_card(), public.admin_get_payout_card(bigint),
  public.save_passport_secure(bigint, text), public.get_passport_secure(bigint), public.referral_guard(bigint)
to authenticated;

grant execute on function public.get_public_config() to anon, authenticated;
