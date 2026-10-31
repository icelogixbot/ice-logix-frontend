-- Откат 20261101090000_admin_inbox_fix: прежние тела функций
-- ── 6. Решение по спору ──
-- p_decision: take (взять в работу) | refund (удовлетворить, при p_refund > 0 — вернуть деньги на баланс) | reject (отказать)
-- Для refund/reject комментарий обязателен (клиент его увидит). Сумма не больше «оплачено − уже возвращено» по заказу.
create or replace function public.admin_dispute_decision(p_id uuid, p_decision text, p_comment text default null, p_refund numeric default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  t public.arbitration_tickets;
  v_dec text := lower(trim(coalesce(p_decision, '')));
  v_comment text := trim(coalesce(p_comment, ''));
  v_refund numeric := round(coalesce(p_refund, 0), 2);
  v_max numeric;
  v_status text;
begin
  if v_dec not in ('take', 'refund', 'reject') then
    raise exception 'Неизвестное решение';
  end if;
  select * into t from public.arbitration_tickets where id = p_id for update;
  if not found then
    raise exception 'Спор не найден';
  end if;
  if coalesce(t.status, 'open') in ('resolved', 'closed', 'rejected') then
    raise exception 'Спор уже закрыт';
  end if;

  if v_dec = 'take' then
    if coalesce(t.status, 'open') = 'in_progress' then
      raise exception 'Спор уже в работе';
    end if;
    update public.arbitration_tickets set status = 'in_progress', assigned_to = v_me, updated_at = now() at time zone 'utc' where id = t.id;
    perform public.admin_log('dispute_take', 'dispute', t.id::text, '{}'::jsonb);
    return jsonb_build_object('ok', true, 'status', 'in_progress', 'refunded', 0);
  end if;

  if length(v_comment) < 3 then
    raise exception 'Напишите комментарий для клиента';
  end if;
  if p_refund is not null and v_dec = 'reject' then
    raise exception 'Сумма указывается только при удовлетворении спора';
  end if;
  if p_refund is not null and v_refund <= 0 then
    raise exception 'Сумма возврата должна быть больше нуля';
  end if;

  if v_dec = 'refund' and v_refund > 0 then
    if t.order_id is null then
      raise exception 'У спора нет заказа — вернуть деньги нельзя';
    end if;
    select greatest(coalesce(total_paid, 0) - coalesce(total_refunded, 0), 0) into v_max from public.orders where id = t.order_id for update;
    if v_refund > coalesce(v_max, 0) then
      raise exception 'Сумма больше, чем можно вернуть по заказу (%)', coalesce(v_max, 0);
    end if;
    perform public.wallet_move(t.opened_by, v_refund, 'CREDIT', 'DISPUTE_REFUND', 'REFUND', t.order_id, null, 'dispute:' || t.id);
    insert into public.refunds (order_id, user_id, amount, destination, status, reason, created_by, completed_at)
    values (t.order_id, t.opened_by, v_refund, 'BALANCE', 'COMPLETED', 'Спор', v_me, now());
    update public.orders set total_refunded = coalesce(total_refunded, 0) + v_refund, updated_at = now() where id = t.order_id;
    perform public.order_event(t.order_id, 'DISPUTE_REFUND', 'OPERATOR', jsonb_build_object('amount', v_refund, 'dispute_id', t.id), null);
  else
    v_refund := 0;
  end if;

  v_status := case when v_dec = 'refund' then 'resolved' else 'rejected' end;
  update public.arbitration_tickets
     set status = v_status, resolution = left(v_comment, 2000), assigned_to = coalesce(assigned_to, v_me),
         resolved_at = now() at time zone 'utc', updated_at = now() at time zone 'utc'
   where id = t.id;
  perform public._inbox_notify(t.opened_by, 'dispute', v_status,
    v_comment || case when v_refund > 0 then E'\nВозврат на баланс: ' || v_refund else '' end, t.id::text, 'inbox:dispute:' || t.id);
  perform public.admin_log('dispute_' || v_dec, 'dispute', t.id::text, jsonb_build_object('refund', v_refund, 'comment', v_comment, 'order_id', t.order_id));
  return jsonb_build_object('ok', true, 'status', v_status, 'refunded', v_refund);
end $$;

-- ── 8. Перепродажа: одобрить или отклонить ──
create or replace function public.admin_resale_decision(p_id uuid, p_approve boolean, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  s public.resale_items;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  select * into s from public.resale_items where id = p_id for update;
  if not found then
    raise exception 'Объявление не найдено';
  end if;
  if coalesce(s.status, 'pending') <> 'pending' then
    raise exception 'Объявление уже рассмотрено';
  end if;
  if not coalesce(p_approve, false) and length(v_reason) < 3 then
    raise exception 'Укажите причину отказа';
  end if;
  update public.resale_items set status = case when p_approve then 'approved' else 'rejected' end where id = s.id;
  perform public._inbox_notify(s.user_id, 'resale', case when p_approve then 'approved' else 'rejected' end,
    case when p_approve then 'Объявление «' || left(s.title, 100) || '» одобрено' else 'Объявление «' || left(s.title, 100) || '» отклонено: ' || v_reason end,
    s.id::text, 'inbox:resale:' || s.id);
  perform public.admin_log(case when p_approve then 'resale_approve' else 'resale_reject' end, 'resale', s.id::text,
                           jsonb_build_object('reason', nullif(v_reason, ''), 'title', s.title));
  return jsonb_build_object('ok', true, 'status', case when p_approve then 'approved' else 'rejected' end);
end $$;

revoke all on function public.admin_dispute_decision(uuid, text, text, numeric) from public, anon;
revoke all on function public.admin_resale_decision(uuid, boolean, text) from public, anon;
grant execute on function public.admin_dispute_decision(uuid, text, text, numeric) to authenticated;
grant execute on function public.admin_resale_decision(uuid, boolean, text) to authenticated;
