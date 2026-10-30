-- Откат 20261030122000_rls_lockdown: возвращает доступ «как было» (всё открыто), если после включения
-- защиты что-то важное перестало работать. Это ОТКРЫВАЕТ данные — применять только на время починки.
-- Запуск: npx supabase db query --linked -f supabase/rollback/20261030122000_rls_lockdown_rollback.sql

drop trigger if exists users_guard on public.users;
drop trigger if exists orders_guard on public.orders;
drop trigger if exists reviews_protect on public.reviews;

do $$
declare
  t text;
  p record;
  -- таблицы, где до миграции RLS был выключен
  was_off text[] := array['admin_logs', 'arbitration_tickets', 'carpool_posts', 'cart', 'certificates', 'courses',
    'dropshipper_settings', 'encryption_keys', 'expenses', 'lessons', 'marketplaces', 'order_incidents', 'order_items',
    'package_photos', 'parsed_products', 'partners', 'payout_requests', 'products', 'promocodes', 'promotions',
    'public_reports', 'recovery_codes', 'referrals', 'resale_items', 'review_actions', 'review_likes', 'reviews', 'settings',
    'social_media_queue', 'suppliers', 'ticket_messages', 'transaction_history', 'ugc_videos', 'user_agreements',
    'user_courses', 'user_lessons_progress', 'user_views', 'verification_codes', 'weight_standards', 'wishlist'];
  -- таблицы, где RLS был включён, но с политикой «всё всем»
  was_open text[] := array['ai_requests', 'app_settings', 'bonus_shop_items', 'bonus_shop_orders', 'dynamic_texts',
    'faq_items', 'insurance_claims', 'invoices', 'kyc_verifications', 'legit_check_brands', 'legit_check_models',
    'legit_check_reference_photos', 'legit_check_requests', 'logistics_events', 'order_messages', 'orders', 'parse_queue',
    'recipients', 'support_messages', 'support_tickets', 'transactions', 'user_notifications', 'users'];
begin
  foreach t in array was_off || was_open loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
  foreach t in array was_off loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I disable row level security', t);
    end if;
  end loop;
  foreach t in array was_open loop
    if to_regclass('public.' || t) is not null then
      execute format('create policy %I on public.%I for all using (true) with check (true)', t || '_rollback_open', t);
    end if;
  end loop;
end $$;
