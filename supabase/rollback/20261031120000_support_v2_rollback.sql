-- Откат миграции 20261031120000_support_v2.sql (данные старых колонок не трогаются)
drop trigger if exists support_messages_after_insert on public.support_messages;
drop trigger if exists support_tickets_before_update on public.support_tickets;
drop function if exists public.support_messages_after_insert();
drop function if exists public.support_tickets_before_update();
drop function if exists public.support_team();
drop function if exists public.support_set_operator(bigint, boolean);
drop function if exists public.support_set_notify(bigint, boolean);
drop table if exists public.support_relay;
drop table if exists public.support_bot_state;
drop table if exists public.support_templates;

drop policy if exists support_messages_own_read on public.support_messages;
create policy support_messages_own_read on public.support_messages for select to authenticated
  using (exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = (select public.app_uid())));

alter table public.support_messages
  drop constraint if exists support_messages_media_chk,
  drop constraint if exists support_messages_delivery_chk,
  drop constraint if exists support_messages_sender_chk,
  drop column if exists media_type, drop column if exists file_id, drop column if exists file_name,
  drop column if exists mime_type, drop column if exists is_internal, drop column if exists delivery,
  drop column if exists tg_message_id;
drop function if exists public.support_preview(text, text);

alter table public.support_tickets
  drop constraint if exists support_tickets_number_key, drop constraint if exists support_tickets_status_chk,
  drop constraint if exists support_tickets_source_chk, drop constraint if exists support_tickets_rating_chk,
  drop column if exists number, drop column if exists order_id, drop column if exists source,
  drop column if exists last_sender, drop column if exists waiting_since, drop column if exists first_response_at,
  drop column if exists reminded_at, drop column if exists autoreply_at, drop column if exists rating,
  drop column if exists rating_at, drop column if exists reopened_count, drop column if exists card_dirty,
  drop column if exists op_cards, drop column if exists updated_at;
