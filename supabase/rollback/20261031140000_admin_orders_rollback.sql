-- Откат 20261031140000_admin_orders: убирает функции шагов заказа и возвращает прежние проверки оплаты.
-- Запуск: npx supabase db query --linked -f supabase/rollback/20261031140000_admin_orders_rollback.sql
-- Прежние order_pay и order_price_decision лежат в миграции 20261030121000_wallet_rpc.sql:
-- после этого файла выполните оттуда их определения.
drop function if exists public.admin_order_purchase(uuid, text, numeric, numeric, text);
drop function if exists public.admin_order_weigh(uuid, numeric, numeric, numeric, numeric, text);
drop function if exists public.admin_order_advance(uuid, text, text, text);
drop function if exists public.admin_order_set_tracks(uuid, text, text, text);
drop function if exists public.admin_order_set_due(uuid, numeric, text);
drop function if exists public.admin_order_cancel(uuid, text, numeric);
drop function if exists public.admin_order_archive(uuid, boolean);
drop function if exists public.admin_order_force_status(uuid, text, text);
drop function if exists public.admin_orders_list(text, text, integer, integer);
drop function if exists public.admin_order_card(uuid);
