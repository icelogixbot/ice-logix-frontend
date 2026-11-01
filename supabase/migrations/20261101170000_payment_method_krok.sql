-- Новый способ оплаты «КРОК»: payments.method теперь допускает 'krok'.
-- Заявка создаётся через Edge Function payments: она вызывает request_topup/order_pay с 'manual'
-- и сразу проставляет method = 'krok' (RPC не менялись). Подтверждает оплату админ, как для ЕРИП/Оплати.
-- Откат: supabase/rollback/20261101170000_payment_method_krok_rollback.sql

do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.payments'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%method%' and pg_get_constraintdef(oid) ilike '%erip%'
  loop
    execute format('alter table public.payments drop constraint %I', c);
  end loop;
end $$;

alter table public.payments
  add constraint payments_method_check check (method in ('manual', 'card', 'card_token', 'erip', 'oplati', 'krok'));
