-- Аудит, этап 2: закрыть хранилище файлов.
-- Загружать могут только вошедшие (authenticated); анонимные политики INSERT удалены.
-- Пути клиента не меняются: product-screenshots/ugc кладут в папку sessionId, поэтому там без привязки к папке.
-- agreements — приватный, читает владелец (папка = user_id) и админ, через createSignedUrl.
-- Лимиты размера и типов файлов ставятся на бакеты (их проверяет сервис хранилища, даже для секретного ключа бота).
-- Откат: supabase/rollback/20261116120000_storage_lockdown_rollback.sql

-- 1. Анонимные загрузки — убрать
drop policy if exists "Allow public insert" on storage.objects;
drop policy if exists "Anon can upload screenshots" on storage.objects;
drop policy if exists "INSERT 31wujt_0" on storage.objects;
drop policy if exists "Users can upload photos" on storage.objects;
drop policy if exists "Users can upload review photos" on storage.objects;
drop policy if exists "allow_anon_uploads_product_screenshots" on storage.objects;
drop policy if exists "ugc_anon_insert" on storage.objects;

-- 2. Загрузка только для вошедших
create policy "auth_insert_product_screenshots" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-screenshots');

create policy "auth_insert_ugc" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ugc');

create policy "auth_insert_review_photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'review-photos');

create policy "auth_insert_own_agreement" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'agreements'
    and (storage.foldername(name))[1] in (public.app_uid()::text, auth.uid()::text)
  );

create policy "auth_insert_own_kyc" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'kyc-documents'
    and (
      starts_with(name, 'kyc_' || public.app_uid()::text || '_')
      or starts_with(name, 'kyc_' || auth.uid()::text || '_')
    )
  );

create policy "admin_insert_marketplace_logos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'marketplace-logos' and public.app_is_admin());

-- 3. Договоры — приватные; читает владелец и админ
update storage.buckets set public = false where id = 'agreements';

create policy "auth_read_own_agreement" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'agreements'
    and (
      (storage.foldername(name))[1] in (public.app_uid()::text, auth.uid()::text)
      or public.app_is_admin()
    )
  );

-- 4. Лимиты размера и типов
update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array['image/*']
  where id = 'avatars';
update storage.buckets set file_size_limit = 52428800, allowed_mime_types = array['image/*', 'video/*', 'audio/*']
  where id = 'review-photos';
update storage.buckets set file_size_limit = 52428800, allowed_mime_types = array['image/*', 'video/*']
  where id = 'ugc';
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['application/pdf']
  where id = 'agreements';
update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array['image/*']
  where id = 'order_photos';
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/*']
  where id = 'marketplace-logos';
