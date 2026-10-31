-- Клиент может сам отменить заказ, пока первый этап не оплачен (решение владельца 2026-10-31).
-- Списанное с баланса возвращается на баланс. Пока платёж идёт в банке, отмена запрещена:
-- payment_settle не зачитывает отменённый платёж, и деньги, пришедшие позже, никуда бы не попали.
-- Откат: supabase/rollback/20261031141000_order_cancel_unpaid_rollback.sql

create or replace function public.order_cancel_unpaid(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
  if o.status = 'cancelled' then
    return jsonb_build_object('status', 'cancelled', 'already', true);
  end if;
  if o.status <> 'pending' or coalesce(o.first_payment_paid, false) then
    raise exception 'Заказ уже оплачен и в работе. Отменить его поможет поддержка';
  end if;

  -- Банк ещё может подтвердить оплату: ЕРИП, пока счёт действует, карта — первые 30 минут. Спорный платёж решает оператор.
  if exists (
    select 1 from public.payments p
     where p.order_id = o.id
       and (p.status = 'REQUIRES_REVIEW'
            or (p.status in ('CREATED', 'PENDING') and p.provider <> 'manual'
                and ((p.method = 'erip' and coalesce(p.expires_at, 'infinity') > now())
                     or p.created_at > now() - interval '30 minutes')))
  ) then
    raise exception 'Оплата по этому заказу ещё идёт в банке. Отменить его можно будет позже или через поддержку';
  end if;

  update public.payments set status = 'CANCELLED'
   where order_id = o.id and status in ('CREATED', 'PENDING');

  v_refund := round(coalesce(o.total_paid, 0) - coalesce(o.total_refunded, 0), 2);
  if v_refund > 0 then
    v_bal := public.wallet_move(v_uid, v_refund, 'CREDIT', 'REFUND_TO_BALANCE', 'REFUND', o.id, null, 'cancel:' || o.id);
    insert into public.refunds (order_id, user_id, amount, destination, status, reason, created_by, completed_at)
    values (o.id, v_uid, v_refund, 'BALANCE', 'COMPLETED', 'Клиент отменил неоплаченный заказ', v_uid, now());
  end if;

  update public.orders
     set status = 'cancelled',
         auto_cancel_reason = 'Отменён клиентом',
         total_refunded = coalesce(total_refunded, 0) + greatest(coalesce(v_refund, 0), 0),
         updated_at = now()
   where id = o.id;
  perform public.order_event(o.id, 'CANCELLED_BY_CLIENT', 'CLIENT', jsonb_build_object('refund', coalesce(v_refund, 0)));

  select ices_balance into v_bal from public.users where user_id = v_uid;
  return jsonb_build_object('status', 'cancelled', 'refund', coalesce(v_refund, 0), 'balance', v_bal);
end $function$;

revoke all on function public.order_cancel_unpaid(uuid) from public, anon;
grant execute on function public.order_cancel_unpaid(uuid) to authenticated;
