-- Откат 20261031141000_order_cancel_unpaid: клиент снова не может отменить неоплаченный заказ.
-- Уже отменённые заказы и возвраты на баланс остаются как есть.
-- Запуск: npx supabase db query --linked -f supabase/rollback/20261031141000_order_cancel_unpaid_rollback.sql
drop function if exists public.order_cancel_unpaid(uuid);
