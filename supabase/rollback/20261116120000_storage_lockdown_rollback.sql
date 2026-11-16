-- Откат 20261116120000_storage_lockdown.sql — вернуть политики и настройки бакетов как было.

drop policy if exists "auth_insert_product_screenshots" on storage.objects;
drop policy if exists "auth_insert_ugc" on storage.objects;
drop policy if exists "auth_insert_review_photos" on storage.objects;
drop policy if exists "auth_insert_own_agreement" on storage.objects;
drop policy if exists "auth_insert_own_kyc" on storage.objects;
drop policy if exists "admin_insert_marketplace_logos" on storage.objects;
drop policy if exists "auth_read_own_agreement" on storage.objects;

create policy "Allow public insert" on storage.objects
  for insert to public with check (bucket_id = 'avatars');
create policy "Anon can upload screenshots" on storage.objects
  for insert to anon
  with check (bucket_id = 'product-screenshots' and (storage.foldername(name))[1] ~ '^[a-f0-9-]{8,}$');
create policy "INSERT 31wujt_0" on storage.objects
  for insert to public with check (bucket_id = 'agreements');
create policy "Users can upload photos" on storage.objects
  for insert to public with check (bucket_id = 'order_photos');
create policy "Users can upload review photos" on storage.objects
  for insert to public with check (bucket_id = 'review-photos');
create policy "allow_anon_uploads_product_screenshots" on storage.objects
  for insert to public with check (bucket_id = 'product-screenshots');
create policy "ugc_anon_insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'ugc');

update storage.buckets set public = true where id = 'agreements';

update storage.buckets set file_size_limit = null, allowed_mime_types = null
  where id in ('avatars', 'review-photos', 'ugc', 'agreements', 'order_photos', 'marketplace-logos');
