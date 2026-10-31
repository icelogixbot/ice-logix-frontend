-- Откат этапа «Обращения»: убирает новые функции и возвращает прежнее ограничение видов уведомлений.
-- Перед откатом очереди нужно, чтобы в notification_queue не было строк kind = 'inbox_update' (иначе ограничение не вернётся).
drop function if exists public.admin_inbox_counts();
drop function if exists public.admin_inbox_list(text, text, integer, integer);
drop function if exists public.admin_dispute_card(uuid);
drop function if exists public.admin_dispute_reply(uuid, text);
drop function if exists public.admin_dispute_decision(uuid, text, text, numeric);
drop function if exists public.admin_legit_verdict(uuid, text, text);
drop function if exists public.admin_resale_decision(uuid, boolean, text);
drop function if exists public._inbox_notify(bigint, text, text, text, text, text);

delete from public.notification_queue where kind = 'inbox_update';
alter table public.notification_queue drop constraint if exists notification_queue_kind_check;
alter table public.notification_queue add constraint notification_queue_kind_check
  check (kind = any (array['order_status','promotion','news','currency','security','kyc_status']));
