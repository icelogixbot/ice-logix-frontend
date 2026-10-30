-- Этап А: защита таблиц.
-- До этой миграции почти все таблицы были открыты всем с публичным ключом (RLS выключен или политика true).
-- Теперь: справочники читают все, меняют админы; свои данные — только владелец; деньги и служебное — только сервер.
-- Сервер (секретный ключ, функции базы SECURITY DEFINER) RLS не касается.
-- Откат: supabase/rollback/20261030122000_rls_lockdown_rollback.sql
-- Не трогаем таблицы, у которых права уже настроены другими миграциями: app_locks, app_lock_attempts,
-- notification_queue, pdd_jobs, pdd_workers, admin_events, admin_topics и финансовые таблицы из financial_core.

-- ---------------------------------------------------------------------------
-- 1. Защита полей от изменений из приложения
-- ---------------------------------------------------------------------------

-- Профиль: клиент меняет только своё безопасное (имя, аватар, настройки, данные проверки паспорта «на проверку»)
create or replace function public.users_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  o jsonb;
  n jsonb;
  c text;
  locked text[] := array['user_id', 'auth_id', 'telegram_id', 'ices_balance', 'role', 'referral_count', 'referral_bonus',
                         'referrer_id', 'is_trusted', 'is_banned', 'ban_reason', 'ban_expires_at', 'warnings_count', 'is_toxic',
                         'kyc_verified_at', 'total_spent', 'orders_count', 'client_level', 'vault_passport', 'encrypted_passport',
                         'encrypted_card', 'last_spin', 'created_at'];
begin
  if public.app_is_privileged() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'user';
    new.ices_balance := 0;
    new.referral_count := 0;
    new.referral_bonus := 0;
    new.is_trusted := false;
    new.is_banned := false;
    new.kyc_verified_at := null;
    new.vault_passport := null;
    new.encrypted_card := null;
    return new;
  end if;

  o := to_jsonb(old);
  n := to_jsonb(new);
  foreach c in array locked loop
    if (o -> c) is distinct from (n -> c) then
      raise exception 'Поле % меняется только сервером', c using errcode = '42501';
    end if;
  end loop;

  -- реферальный код можно задать один раз
  if old.referral_code is not null and new.referral_code is distinct from old.referral_code then
    raise exception 'Реферальный код уже задан' using errcode = '42501';
  end if;
  -- проверку паспорта клиент может только отправить «на проверку»
  if new.kyc_status is distinct from old.kyc_status and new.kyc_status <> 'pending' then
    raise exception 'Статус проверки меняет оператор' using errcode = '42501';
  end if;

  -- служебные ключи настроек: колесо удачи, семья — только сервер; бесплатные доставки можно только тратить
  if new.settings is distinct from old.settings then
    new.settings := coalesce(new.settings, '{}'::jsonb);
    new.settings := new.settings - 'last_fortune_spin' - 'family';
    if old.settings ? 'last_fortune_spin' then
      new.settings := jsonb_set(new.settings, '{last_fortune_spin}', old.settings -> 'last_fortune_spin');
    end if;
    if old.settings ? 'family' then
      new.settings := jsonb_set(new.settings, '{family}', old.settings -> 'family');
    end if;
    if coalesce((new.settings ->> 'free_delivery_tokens')::numeric, 0) > coalesce((old.settings ->> 'free_delivery_tokens')::numeric, 0) then
      new.settings := jsonb_set(new.settings, '{free_delivery_tokens}', coalesce(old.settings -> 'free_delivery_tokens', '0'::jsonb));
    end if;
  end if;
  return new;
end $$;

drop trigger if exists users_guard on public.users;
create trigger users_guard before insert or update on public.users
  for each row execute function public.users_guard();

-- Заказ от клиента всегда создаётся неоплаченным; оплату отмечает только сервер (order_pay, payment_settle)
create or replace function public.orders_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.app_is_privileged() then
    return new;
  end if;
  new.status := 'pending';
  new.first_payment_paid := false;
  new.second_payment_paid := false;
  new.total_paid := 0;
  new.total_refunded := 0;
  new.balance_used := 0;
  new.amount_due := 0;
  new.referral_reward_processed := false;
  new.referral_reward_amount := 0;
  new.weight_final := null;
  new.weight_actual := null;
  new.delivered_at := null;
  new.flags := coalesce(new.flags, '[]'::jsonb) || '["client_priced"]'::jsonb;  -- цену посчитал браузер: сверить перед выкупом
  if new.auto_cancel_reason is distinct from 'family_approval_pending' then
    new.auto_cancel_reason := null;
  end if;
  return new;
end $$;

drop trigger if exists orders_guard on public.orders;
create trigger orders_guard before insert on public.orders
  for each row execute function public.orders_guard();

-- Общая защита: перечисленные поля не меняются из приложения (кроме админа)
create or replace function public.protect_columns() returns trigger
language plpgsql set search_path = public as $$
declare
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
  c text;
begin
  if public.app_is_privileged() then
    return new;
  end if;
  foreach c in array tg_argv loop
    if (o -> c) is distinct from (n -> c) then
      raise exception 'Поле % меняется только сервером', c using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists reviews_protect on public.reviews;
create trigger reviews_protect before update on public.reviews for each row execute function
  public.protect_columns('user_id', 'is_verified', 'is_published', 'bonus_given', 'moderation_status', 'moderation_reason',
                         'moderated_by', 'moderated_at', 'is_pinned', 'likes_count', 'post_processed');

-- ---------------------------------------------------------------------------
-- 2. Убираем старые политики «всё всем» на защищаемых таблицах
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  p record;
  tables text[] := array[
    'admin_logs', 'ai_requests', 'app_settings', 'arbitration_tickets', 'bonus_shop_items', 'bonus_shop_orders', 'carpool_posts',
    'cart', 'certificates', 'courses', 'dropshipper_settings', 'dynamic_texts', 'encryption_keys', 'expenses', 'faq_items',
    'insurance_claims', 'invoices', 'kyc_verifications', 'legit_check_brands', 'legit_check_models', 'legit_check_reference_photos',
    'legit_check_requests', 'lessons', 'logistics_events', 'marketplaces', 'order_incidents', 'order_items', 'order_messages',
    'orders', 'package_photos', 'parse_queue', 'parsed_products', 'partners', 'payout_requests', 'products', 'promocodes',
    'promotions', 'public_reports', 'recipients', 'recovery_codes', 'referrals', 'resale_items', 'review_actions', 'review_likes',
    'reviews', 'settings', 'social_media_queue', 'suppliers', 'support_messages', 'support_tickets', 'ticket_messages',
    'transaction_history', 'transactions', 'ugc_videos', 'user_agreements', 'user_courses', 'user_lessons_progress',
    'user_notifications', 'user_views', 'users', 'verification_codes', 'weight_standards', 'wishlist'];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    -- админ (owner/admin) может всё; сервер обходит RLS сам
    execute format('create policy %I on public.%I for all to authenticated using ((select public.app_is_admin())) with check ((select public.app_is_admin()))',
                   t || '_admin', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Справочники: читают все, меняют админы
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['app_settings', 'bonus_shop_items', 'courses', 'dynamic_texts', 'faq_items', 'legit_check_brands',
                           'legit_check_models', 'legit_check_reference_photos', 'lessons', 'marketplaces', 'products',
                           'promotions', 'public_reports', 'settings', 'weight_standards', 'parsed_products', 'carpool_posts'] loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_read', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Свои данные: владелец видит и меняет только своё
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['cart', 'wishlist', 'user_views', 'user_lessons_progress', 'dropshipper_settings'] loop
    execute format('create policy %I on public.%I for all to authenticated using (user_id = (select public.app_uid())) with check (user_id = (select public.app_uid()))',
                   t || '_own', t);
  end loop;
  -- только чтение своего (пишет сервер или админ)
  foreach t in array array['transactions', 'transaction_history', 'invoices', 'legit_check_requests', 'bonus_shop_orders',
                           'user_courses', 'certificates'] loop
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select public.app_uid()))',
                   t || '_own_read', t);
  end loop;
end $$;

-- получатели: user_id хранится текстом
create policy recipients_own on public.recipients for all to authenticated
  using (user_id = (select public.app_uid())::text) with check (user_id = (select public.app_uid())::text);

create policy user_agreements_own_read on public.user_agreements for select to authenticated using (user_id = (select public.app_uid()));
create policy user_agreements_own_insert on public.user_agreements for insert to authenticated with check (user_id = (select public.app_uid()));

create policy user_notifications_own_read on public.user_notifications for select to authenticated using (user_id = (select public.app_uid()));
create policy user_notifications_own_update on public.user_notifications for update to authenticated
  using (user_id = (select public.app_uid())) with check (user_id = (select public.app_uid()));

create policy referrals_own_read on public.referrals for select to authenticated
  using (referrer_id = (select public.app_uid()) or referred_id = (select public.app_uid()));

create policy parse_queue_own_read on public.parse_queue for select to authenticated using (user_id = (select public.app_uid()));
create policy parse_queue_own_insert on public.parse_queue for insert to authenticated with check (user_id = (select public.app_uid()));

create policy payout_requests_own_read on public.payout_requests for select to authenticated using (user_id = (select public.app_uid()));
create policy payout_requests_own_insert on public.payout_requests for insert to authenticated
  with check (user_id = (select public.app_uid()) and coalesce(status, 'pending') = 'pending');

create policy insurance_claims_own_read on public.insurance_claims for select to authenticated using (user_id = (select public.app_uid()));
create policy insurance_claims_own_insert on public.insurance_claims for insert to authenticated
  with check (user_id = (select public.app_uid()) and coalesce(status, 'pending') = 'pending'
              and exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select public.app_uid())));

create policy kyc_verifications_own_read on public.kyc_verifications for select to authenticated using (user_id = (select public.app_uid()));
create policy kyc_verifications_own_insert on public.kyc_verifications for insert to authenticated
  with check (user_id = (select public.app_uid()) and coalesce(status, 'pending') = 'pending' and moderated_by is null);

create policy ugc_videos_own_read on public.ugc_videos for select to authenticated using (user_id = (select public.app_uid()));
create policy ugc_videos_own_insert on public.ugc_videos for insert to authenticated
  with check (user_id = (select public.app_uid()) and coalesce(status, 'pending') = 'pending' and coalesce(reward_ices, 0) = 0);

create policy resale_items_own_read on public.resale_items for select to authenticated using (user_id = (select public.app_uid()));

create policy carpool_posts_own_write on public.carpool_posts for all to authenticated
  using (user_id = (select public.app_uid())) with check (user_id = (select public.app_uid()));

-- Отзывы: опубликованные видят все, свои — автор; новый отзыв всегда уходит на модерацию
create policy reviews_read on public.reviews for select to anon, authenticated
  using (is_published or user_id = (select public.app_uid()));
create policy reviews_own_insert on public.reviews for insert to authenticated
  with check (user_id = (select public.app_uid()) and not coalesce(is_published, false) and not coalesce(is_verified, false)
              and not coalesce(bonus_given, false) and not coalesce(is_pinned, false));
create policy reviews_own_update on public.reviews for update to authenticated
  using (user_id = (select public.app_uid())) with check (user_id = (select public.app_uid()));
create policy reviews_own_delete on public.reviews for delete to authenticated using (user_id = (select public.app_uid()));

create policy review_likes_read on public.review_likes for select to anon, authenticated using (true);
create policy review_likes_own on public.review_likes for insert to authenticated with check (user_id = (select public.app_uid()));
create policy review_likes_own_delete on public.review_likes for delete to authenticated using (user_id = (select public.app_uid()));

create policy review_actions_read on public.review_actions for select to anon, authenticated using (true);
create policy review_actions_own on public.review_actions for insert to authenticated with check (user_id = (select public.app_uid()));
create policy review_actions_own_update on public.review_actions for update to authenticated
  using (user_id = (select public.app_uid())) with check (user_id = (select public.app_uid()));

-- ---------------------------------------------------------------------------
-- 5. Заказы и всё, что к ним привязано
-- ---------------------------------------------------------------------------
-- Участники моей семьи (для главы): без параметров, чтобы нельзя было узнать чужую семью
create or replace function public.app_family_member_ids() returns bigint[]
language sql stable security definer set search_path = public as $$
  select public.family_members_of(public.app_uid())
$$;
revoke all on function public.app_family_member_ids() from public, anon;
grant execute on function public.app_family_member_ids() to authenticated;

create or replace function public.app_can_see_order(p_order uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
     where o.id = p_order
       and (o.user_id = public.app_uid()
            or o.user_id = any (public.family_members_of(public.app_uid()))
            or public.app_is_support()))
$$;
grant execute on function public.app_can_see_order(uuid) to authenticated;

create policy orders_read on public.orders for select to authenticated
  using (user_id = (select public.app_uid())
         or (select public.app_family_member_ids()) @> array[user_id]
         or (select public.app_is_support()));
create policy orders_own_insert on public.orders for insert to authenticated
  with check (user_id = (select public.app_uid()));

create policy order_items_read on public.order_items for select to authenticated using (public.app_can_see_order(order_id));
create policy order_items_own_insert on public.order_items for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select public.app_uid())));

create policy order_messages_read on public.order_messages for select to authenticated using (public.app_can_see_order(order_id));
create policy order_messages_own_insert on public.order_messages for insert to authenticated
  with check (user_id = (select public.app_uid())
              and exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select public.app_uid())));

create policy order_incidents_read on public.order_incidents for select to authenticated using (public.app_can_see_order(order_id));
create policy package_photos_read on public.package_photos for select to authenticated using (public.app_can_see_order(order_id));
create policy logistics_events_read on public.logistics_events for select to authenticated using (public.app_can_see_order(order_id));

-- ---------------------------------------------------------------------------
-- 6. Пользователи: своя строка; поддержка и админ видят всех
-- ---------------------------------------------------------------------------
create policy users_read on public.users for select to authenticated
  using (auth_id = (select auth.uid()) or (select public.app_is_support()));
create policy users_own_insert on public.users for insert to authenticated
  with check (auth_id = (select auth.uid()));
create policy users_own_update on public.users for update to authenticated
  using (auth_id = (select auth.uid())) with check (auth_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 7. Поддержка: операторы (owner / admin / support) — всё, клиент — свои обращения
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['support_tickets', 'support_messages', 'ticket_messages', 'arbitration_tickets'] loop
    execute format('create policy %I on public.%I for all to authenticated using ((select public.app_is_support())) with check ((select public.app_is_support()))',
                   t || '_support', t);
  end loop;
end $$;
create policy support_tickets_own_read on public.support_tickets for select to authenticated using (user_id = (select public.app_uid()));
create policy support_messages_own_read on public.support_messages for select to authenticated
  using (exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = (select public.app_uid())));

-- Остальное (encryption_keys, recovery_codes, verification_codes, promocodes, admin_logs, ai_requests, expenses,
-- suppliers, partners, social_media_queue) — только админ и сервер: политик для клиента нет.
