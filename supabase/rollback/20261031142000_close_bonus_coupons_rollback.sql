-- Откат 20261031142000_close_bonus_coupons: купоны снова в продаже.
-- Внимание: buy_bonus_item всё ещё выдаёт код, которого нет в promocodes. Перед возвратом купонов это нужно исправить.
-- Запуск: npx supabase db query --linked -f supabase/rollback/20261031142000_close_bonus_coupons_rollback.sql
update public.bonus_shop_items
   set is_active = true
 where id in ('e88f47dc-2371-4459-b70c-4a9b761f89dd', '1d3fbb19-c108-4916-addb-5892f7028c4f', '91133aea-1512-4ba9-9ac4-e335f348263b');
