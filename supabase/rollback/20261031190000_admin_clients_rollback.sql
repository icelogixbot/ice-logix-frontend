-- Откат миграции 20261031190000_admin_clients.sql: возвращает order_pay и orders_guard без проверки бана,
-- убирает новые функции, политику на фото паспортов и вид сообщения kyc_status.

drop policy if exists "kyc_admin_read_logged" on storage.objects;

drop function if exists public.kyc_photo_allowed(text);
drop function if exists public.admin_kyc_decision(uuid, boolean, text);
drop function if exists public.admin_kyc_photo(uuid);
drop function if exists public.admin_kyc_card(uuid);
drop function if exists public.admin_kyc_list(text, integer, integer);
drop function if exists public.admin_client_card(bigint);
drop function if exists public.admin_clients_list(text, text, integer, integer);
drop function if exists public.admin_user_restrict(bigint, text, text, integer);

create or replace function public.orders_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.app_is_privileged() then
    return new;
  end if;
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
  new.flags := coalesce(new.flags, '[]'::jsonb) || '["client_priced"]'::jsonb;
  if new.auto_cancel_reason is distinct from 'family_approval_pending' then
    new.auto_cancel_reason := null;
  end if;
  return new;
end $$;

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

drop function if exists public.ban_check();

-- Строки kyc_status из очереди удаляем, иначе прежняя проверка не применится.
delete from public.notification_queue where kind = 'kyc_status';
alter table public.notification_queue drop constraint if exists notification_queue_kind_check;
alter table public.notification_queue add constraint notification_queue_kind_check
  check (kind = any (array['order_status', 'promotion', 'news', 'currency', 'security']));
