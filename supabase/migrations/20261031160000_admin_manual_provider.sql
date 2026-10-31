-- Заявки «Я оплатил» создаются с provider = 'manual', а method — способ, который выбрал клиент
-- (manual, erip, oplati, card). Счётчик Пульта и карточка заказа смотрели на method = 'manual',
-- поэтому заявка через ЕРИП или Оплати не попадала в «Требует внимания» и не получала кнопок.
-- Откат: supabase/rollback/20261031160000_admin_manual_provider.sql

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_today timestamptz := date_trunc('day', now() at time zone 'Europe/Minsk') at time zone 'Europe/Minsk';
  v jsonb;
begin
  perform public.admin_require('admin');

  with live as (select * from public.orders where archived_at is null),
  periods as (select * from (values ('today', v_today), ('d7', now() - interval '7 days'), ('d30', now() - interval '30 days')) t(k, since))
  select jsonb_build_object(
    'attention', jsonb_build_object(
      'payments_pending', (select count(*) from public.payments where status in ('PENDING', 'REQUIRES_REVIEW') and provider = 'manual'),
      'orders_to_buy',    (select count(*) from live where status = 'paid'),
      'client_priced',    (select count(*) from live where status = 'paid' and coalesce(flags, '[]'::jsonb) ? 'client_priced'),
      'awaiting_decision',(select count(*) from live where status = 'awaiting_decision'),
      'awaiting_payment', (select count(*) from live where status = 'awaiting_payment'),
      'orders_unpaid',    (select count(*) from live where status = 'pending'),
      'stuck',            (select count(*) from live where status not in ('pending', 'delivered', 'cancelled')
                                                  and coalesce(updated_at, created_at) < now() - interval '7 days'),
      'claims',           (select count(*) from public.insurance_claims where coalesce(status, 'pending') = 'pending'),
      'disputes',         (select count(*) from public.arbitration_tickets where coalesce(status, 'open') not in ('resolved', 'closed', 'rejected')),
      'tickets',          (select count(*) from public.support_tickets where unread_by_operator and coalesce(status, '') <> 'closed'),
      'reviews',          (select count(*) from public.reviews where coalesce(moderation_status, case when is_published then 'approved' else 'pending' end) = 'pending'),
      'ugc',              (select count(*) from public.ugc_videos where coalesce(status, 'pending') = 'pending'),
      'bonus_orders',     (select count(*) from public.bonus_shop_orders where upper(coalesce(status, 'PENDING')) = 'PENDING'),
      'kyc',              (select count(*) from public.kyc_verifications where coalesce(status, 'pending') = 'pending'),
      'payouts',          (select count(*) from public.payout_requests where status = 'pending'),
      'legit',            (select count(*) from public.legit_check_requests where coalesce(status, 'pending') = 'pending'),
      'resale',           (select count(*) from public.resale_items where coalesce(status, 'pending') = 'pending')
    ),
    'stats', (select jsonb_object_agg(p.k, jsonb_build_object(
      'orders',     (select count(*) from public.orders o where o.created_at >= p.since and o.status <> 'cancelled'),
      'turnover',   (select coalesce(sum(coalesce(o.total_byn, o.total_final, o.price_byn, 0)), 0) from public.orders o
                      where o.created_at >= p.since and o.status not in ('cancelled', 'pending')),
      'commission', (select coalesce(sum(coalesce(o.commission_byn, 0)), 0) from public.orders o
                      where o.created_at >= p.since and o.status not in ('cancelled', 'pending')),
      'paid',       (select coalesce(sum(pm.amount), 0) from public.payments pm where pm.status = 'PAID' and coalesce(pm.paid_at, pm.created_at) >= p.since),
      'new_users',  (select count(*) from public.users u where u.created_at >= p.since)
    )) from periods p),
    'health', jsonb_build_object(
      'payments_paused', coalesce((select is_payments_paused from public.app_settings where id = 1), false),
      'pause_reason',    (select pause_reason from public.app_settings where id = 1),
      'pdd_online',      public.pdd_worker_online(),
      'pdd_last_seen',   (select max(last_seen) from public.pdd_workers),
      'notify_failed',   (select count(*) from public.notification_queue where status = 'failed' and created_at > now() - interval '7 days'),
      'notify_queued',   (select count(*) from public.notification_queue where status = 'queued'),
      'last_backup',     (select max(created_at) from public.admin_events where kind like 'backup%'),
      'vacation',        (select value from public.settings where key = 'buyer_vacation')
    ),
    'me', jsonb_build_object('user_id', public.app_uid(), 'role', (select role from public.users where auth_id = auth.uid() order by user_id limit 1)),
    'at', now()
  ) into v;
  return v;
end $$;

-- Карточка заказа: добавлен provider у платежей, по нему админка решает, показывать ли «Деньги пришли»
create or replace function public.admin_order_card(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  o public.orders;
  v_user jsonb;
begin
  perform public.admin_require('admin');
  select * into o from public.orders where id = p_order;
  if not found then raise exception 'Заказ не найден'; end if;
  select jsonb_build_object('user_id', u.user_id, 'name', u.full_name, 'nick', u.username, 'phone', u.phone, 'balance', u.ices_balance,
                            'trusted', u.is_trusted, 'toxic', u.is_toxic, 'banned', u.is_banned, 'kyc', u.kyc_status,
                            'orders', (select count(*) from public.orders x where x.user_id = u.user_id))
    into v_user from public.users u where u.user_id = o.user_id;
  return jsonb_build_object(
    'order', to_jsonb(o),
    'user', v_user,
    'payments', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'type', p.type, 'method', p.method, 'provider', p.provider, 'amount', p.amount, 'status', p.status,
                   'created_at', p.created_at, 'paid_at', p.paid_at) order by p.created_at desc), '[]'::jsonb) from public.payments p where p.order_id = o.id),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('type', e.event_type, 'actor', e.actor_type, 'actor_id', e.actor_id, 'value', e.new_value,
                   'comment', e.comment, 'at', e.created_at) order by e.created_at desc), '[]'::jsonb) from public.order_events e where e.order_id = o.id),
    'purchases', (select coalesce(jsonb_agg(jsonb_build_object('platform_order', p.pinduoduo_order_id, 'price_cny', p.price_cny, 'fee_cny', p.service_fee_cny,
                   'status', p.status, 'at', p.created_at) order by p.created_at desc), '[]'::jsonb) from public.purchases p where p.order_id = o.id),
    'shipping', (select coalesce(jsonb_agg(jsonb_build_object('weight', s.actual_weight, 'delivery', s.actual_delivery_amount, 'at', s.created_at)), '[]'::jsonb) from public.shipping_actuals s where s.order_id = o.id),
    'refunds', (select coalesce(jsonb_agg(jsonb_build_object('amount', r.amount, 'reason', r.reason, 'status', r.status, 'at', r.created_at) order by r.created_at desc), '[]'::jsonb) from public.refunds r where r.order_id = o.id),
    'messages', (select count(*) from public.order_messages m where m.order_id = o.id),
    'config', jsonb_build_object('threshold', public.fin_config('price_change_small_percent', 3), 'insurance_rate', public.fin_config('insurance_rate', 0.02),
                                 'duoduo', (select value from public.financial_configs where key = 'duoduo_fee_rule')),
    'me', jsonb_build_object('owner', public.app_is_owner())
  );
end $$;
