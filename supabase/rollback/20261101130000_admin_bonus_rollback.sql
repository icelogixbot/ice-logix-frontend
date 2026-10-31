-- Откат: убирает админские функции бонусного магазина (данные товаров и заказов не трогает).
drop function if exists public.admin_bonus_overview();
drop function if exists public.admin_bonus_item_save(uuid, text, text, text, numeric, integer, boolean, text, integer);
drop function if exists public.admin_bonus_order_close(uuid, boolean, text);
