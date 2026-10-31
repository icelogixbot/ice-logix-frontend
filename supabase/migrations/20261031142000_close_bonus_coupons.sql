-- Купоны в магазине бонусов сняты с продажи: скидки теперь заводятся только в админке (решение владельца 2026-10-31).
-- Кроме того, купон не работал: buy_bonus_item списывал баланс и выдавал код ICE-REWARD-…, которого нет в promocodes,
-- поэтому на оформлении код не принимался. Купоны никто не покупал, возвращать нечего.
-- Откат: supabase/rollback/20261031142000_close_bonus_coupons_rollback.sql
update public.bonus_shop_items
   set is_active = false
 where id in ('e88f47dc-2371-4459-b70c-4a9b761f89dd', '1d3fbb19-c108-4916-addb-5892f7028c4f', '91133aea-1512-4ba9-9ac4-e335f348263b');
