-- Откат 20261031101000_hide_expired_promotion: карточка «Рефералка» снова видна на экране «Акции».
-- Запуск: npx supabase db query --linked -f supabase/rollback/20261031101000_hide_expired_promotion_rollback.sql
update public.promotions set is_active = true where id = 'dddb21f8-97d2-426b-b9d9-9a918c88681e';
