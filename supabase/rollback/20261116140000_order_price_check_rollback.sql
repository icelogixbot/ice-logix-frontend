-- Откат 20261116140000_order_price_check: возвращает orders_guard и admin_event_orders без сверки цены.
CREATE OR REPLACE FUNCTION public.orders_guard()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
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
  new.flags := coalesce(new.flags, '[]'::jsonb) || '["client_priced"]'::jsonb;  -- цену посчитал клиент: админ сверяет
  if new.auto_cancel_reason is distinct from 'family_approval_pending' then
    new.auto_cancel_reason := null;
  end if;
  if coalesce(new.ice_bonus_n, 0) > 0 and new.auto_cancel_reason is distinct from 'family_approval_pending' then
    select c.o_n, c.o_discount into new.ice_bonus_n, new.ice_bonus_discount
      from public._ice_bonus_order_check(new.user_id, new.ice_bonus_n, new.ice_bonus_discount, new.commission_byn, new.total_byn) c;
  else
    new.ice_bonus_n := 0;
    new.ice_bonus_discount := 0;
  end if;
  if nullif(trim(coalesce(new.promo_code, '')), '') is null then
    new.promo_code := null;
    new.discount_applied := 0;
  else
    select c.o_code, c.o_discount into new.promo_code, new.discount_applied
      from public._promo_order_check(new.promo_code, coalesce(new.total_byn, 0) + new.ice_bonus_discount, new.discount_applied) c;
  end if;
  new.ice_bonus_spent_at := null;
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

drop function if exists public._order_price_check(public.orders);
drop function if exists public._jnum(jsonb);
