-- Откат хвостов этапа 8: возвращает прежние версии функций и политик.
-- После отката Legit-Check снова падает на transactions_type_check (ERR-ADMIN-004), промокод на сервере не проверяется,
-- рассылка доступна админам, запись в настройки — всем админам.

-- Политики записи — снова для админов
drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin on public.app_settings for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));

drop policy if exists financial_configs_admin on public.financial_configs;
create policy financial_configs_admin on public.financial_configs for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));

drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for all to authenticated
  using ((select public.app_is_admin())) with check ((select public.app_is_admin()));

drop function if exists public.admin_save_content_settings(jsonb);

-- orders_guard без проверки промокода
create or replace function public.orders_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.app_is_privileged() then
    return new;
  end if;
  perform public.ban_check();
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
  new.flags := coalesce(new.flags, '[]'::jsonb) || '["client_priced"]'::jsonb;
  if new.auto_cancel_reason is distinct from 'family_approval_pending' then
    new.auto_cancel_reason := null;
  end if;
  return new;
end $$;

drop function if exists public._promo_order_check(text, numeric, numeric);

-- Рассылка — снова на уровне админа
create or replace function public.admin_send_news(p_title text, p_text text, p_key text, p_dry_run boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_text text := trim(coalesce(p_text, ''));
  v_key text := trim(coalesce(p_key, ''));
  v_count integer;
begin
  perform public.admin_require('admin');
  if length(v_title) < 3 or length(v_title) > 100 then
    raise exception 'Заголовок: от 3 до 100 символов';
  end if;
  if length(v_text) < 10 or length(v_text) > 1000 then
    raise exception 'Текст: от 10 до 1000 символов';
  end if;
  if coalesce(p_dry_run, true) then
    return jsonb_build_object('ok', true, 'dry_run', true, 'recipients', public.enqueue_news(v_title, v_text, 'preview', true));
  end if;
  if v_key !~ '^[A-Za-z0-9_-]{8,64}$' then
    raise exception 'Не хватает ключа отправки';
  end if;
  v_count := public.enqueue_news(v_title, v_text, 'admin:' || v_key, false);
  perform public.admin_log('news_send', 'news', v_key, jsonb_build_object('title', v_title, 'recipients', v_count));
  return jsonb_build_object('ok', true, 'dry_run', false, 'recipients', v_count);
end $$;

-- Бонус за отзыв — снова зашитые 5
create or replace function public.admin_review_decision(p_review uuid, p_approve boolean, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me bigint := public.admin_require('admin');
  r public.reviews;
  v_bonus numeric := 0;
begin
  select * into r from public.reviews where id = p_review for update;
  if not found then
    raise exception 'Отзыв не найден';
  end if;
  if p_approve then
    update public.reviews
       set is_published = true, moderation_status = 'approved', moderation_reason = null,
           moderated_by = v_me, moderated_at = now()
     where id = r.id;
    if not coalesce(r.bonus_given, false) and r.user_id is not null
       and jsonb_typeof(r.media_urls) = 'array' and jsonb_array_length(r.media_urls) > 0 then
      v_bonus := 5;
      perform public.wallet_move(r.user_id, v_bonus, 'CREDIT', 'REVIEW_BONUS', 'BONUS', r.order_id, null, 'review_bonus:' || r.id);
      update public.reviews set bonus_given = true where id = r.id;
    end if;
  else
    update public.reviews
       set is_published = false, moderation_status = 'rejected', moderation_reason = nullif(trim(coalesce(p_reason, '')), ''),
           moderated_by = v_me, moderated_at = now()
     where id = r.id;
  end if;
  perform public.admin_log(case when p_approve then 'review_approved' else 'review_rejected' end, 'review', r.id::text,
                           jsonb_build_object('bonus', v_bonus, 'reason', p_reason));
  return jsonb_build_object('ok', true, 'bonus', v_bonus);
end $$;

delete from public.financial_configs where key = 'review_bonus';

-- Legit-Check — прежний тип записи (снова ломается на transactions_type_check)
create or replace function public.pay_legit_check(p_brand text, p_model text, p_photos text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := public.app_require_uid();
  v_cost numeric := public.fin_config('legit_check_price', 5);
  v_req uuid := gen_random_uuid();
  v_bal numeric;
begin
  if coalesce(trim(p_brand), '') = '' or coalesce(trim(p_model), '') = '' then
    raise exception 'Укажите бренд и модель';
  end if;
  if coalesce(array_length(p_photos, 1), 0) = 0 then
    raise exception 'Добавьте фото';
  end if;
  v_bal := public.wallet_move(v_uid, v_cost, 'DEBIT', 'LEGIT_CHECK', 'PURCHASE', null, null, 'legit:' || v_req);
  insert into public.legit_check_requests (id, user_id, brand, model, photos, status)
  values (v_req, v_uid, left(p_brand, 100), left(p_model, 150), p_photos[1:10], 'pending');
  insert into public.transactions (user_id, amount, type, status, description)
  values (v_uid, -v_cost, 'legit_check', 'completed', 'Оплата ручной проверки Legit-Check (' || left(p_brand, 100) || ' ' || left(p_model, 150) || ')');
  return jsonb_build_object('request_id', v_req, 'balance', v_bal, 'cost', v_cost);
end $$;
