-- Откат: способ «КРОК» убирается. Старые платежи с krok переводим в manual, чтобы ограничение прошло;
-- метка сохраняется в metadata.requested_method.
update public.payments
   set metadata = coalesce(metadata, '{}'::jsonb) || '{"requested_method":"krok"}'::jsonb, method = 'manual'
 where method = 'krok';

alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments
  add constraint payments_method_check check (method in ('manual', 'card', 'card_token', 'erip', 'oplati'));
