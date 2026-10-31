-- Откат 20261031170000_admin_money: убрать функции раздела «Деньги»,
-- вернуть прежние admin_confirm_payment / admin_reject_payment (из 20261030121000_wallet_rpc).
-- Данные (платежи, расходы, выплаты, журнал) не трогаются.

drop function if exists public.admin_money_list(text, text, integer, integer);
drop function if exists public.admin_payout_decision(uuid, text, text);
drop function if exists public.admin_payout_card(uuid);
drop function if exists public.admin_recon_resolve(uuid, text);
drop function if exists public.admin_expense_add(numeric, text, text, date);
drop function if exists public.admin_expense_delete(uuid);
drop function if exists public.admin_money_report(date, date);
drop function if exists public.admin_recon_rows();
drop function if exists public.admin_payout_stats(bigint, uuid);
drop function if exists public.admin_money_reason(text, text);

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
