-- Админка, хвосты этапа 8: ERR-ADMIN-004 (Legit-Check), бонус за отзыв в одном месте, ERR-ADMIN-005 (промокод и рассылка на сервере),
-- ERR-ADMIN-006 (запись в настройки — только владелец).
-- Откат: supabase/rollback/20261101160000_admin_tail_fixes_rollback.sql

-- ── 1. ERR-ADMIN-004: проверка Legit-Check падала на transactions_type_check ──
-- Тип 'legit_check' не входит в допустимые (deposit, withdrawal, payment, refund, referral_bonus, cashback). Пишем как 'payment'.
-- Остальное тело функции прежнее; права на вызов сохраняются при create or replace.
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
  values (v_uid, -v_cost, 'payment', 'completed', 'Оплата ручной проверки Legit-Check (' || left(p_brand, 100) || ' ' || left(p_model, 150) || ')');
  return jsonb_build_object('request_id', v_req, 'balance', v_bal, 'cost', v_cost);
end $$;

-- ── 2. Бонус за отзыв: фиксированная сумма из financial_configs.review_bonus (по умолчанию 5) ──
-- Проценты в settings.reviews_config (bonus_*_pct) никогда не применялись сервером — это мёртвые ключи, их больше не показываем.
insert into public.financial_configs (key, value, description)
values ('review_bonus', '5'::jsonb, 'Бонус клиенту за отзыв с фото или видео, один раз')
on conflict (key) do nothing;

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
      v_bonus := greatest(public.fin_config('review_bonus', 5), 0);
      if v_bonus > 0 then
        perform public.wallet_move(r.user_id, v_bonus, 'CREDIT', 'REVIEW_BONUS', 'BONUS', r.order_id, null, 'review_bonus:' || r.id);
      end if;
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

-- ── 3. ERR-ADMIN-005: промокод проверяется на сервере при создании заказа ──
-- Клиент вставляет заказ напрямую, поэтому проверка живёт в триггере orders_guard. Сам триггер без security definer
-- (app_is_privileged смотрит на current_user), а таблица promocodes клиенту закрыта, поэтому чтение и блокировку строки
-- кода делает эта функция. Блокировка держится до конца транзакции: два заказа с последним оставшимся использованием
-- не пройдут оба. Возвращает допустимую скидку (клиентская сумма обрезается сверху).
create or replace function public._promo_order_check(p_code text, p_total numeric, p_discount numeric, out o_code text, out o_discount numeric)
language plpgsql security definer set search_path = public as $$
declare
  r public.promocodes;
  v_base numeric := greatest(coalesce(p_total, 0), 0) + greatest(coalesce(p_discount, 0), 0);
  v_cap numeric;
begin
  select * into r from public.promocodes
   where upper(code) = upper(trim(coalesce(p_code, ''))) and coalesce(is_active, true)
   order by created_at limit 1 for update;
  if not found then
    raise exception 'Промокод не найден или отключён';
  end if;
  if r.expires_at is not null and r.expires_at <= now() then
    raise exception 'Срок действия промокода закончился';
  end if;
  if r.usage_limit is not null and public._promo_used(r.code) >= r.usage_limit then
    raise exception 'Промокод уже использован максимальное число раз';
  end if;
  if r.discount_type = 'percent' then
    v_cap := round(v_base * r.discount_value / 100, 2);
  else
    v_cap := least(r.discount_value, v_base);
  end if;
  o_code := r.code;
  o_discount := greatest(least(coalesce(p_discount, 0), v_cap), 0);
end $$;
revoke all on function public._promo_order_check(text, numeric, numeric) from public, anon;
grant execute on function public._promo_order_check(text, numeric, numeric) to authenticated;

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
  new.flags := coalesce(new.flags, '[]'::jsonb) || '["client_priced"]'::jsonb;  -- цену посчитал браузер: сверить перед выкупом
  if new.auto_cancel_reason is distinct from 'family_approval_pending' then
    new.auto_cancel_reason := null;
  end if;
  -- промокод: действующий, в сроке и не выше лимита; скидка не больше положенной по коду
  if nullif(trim(coalesce(new.promo_code, '')), '') is null then
    new.promo_code := null;
    new.discount_applied := 0;
  else
    select c.o_code, c.o_discount into new.promo_code, new.discount_applied
      from public._promo_order_check(new.promo_code, new.total_byn, new.discount_applied) c;
  end if;
  return new;
end $$;

-- ── 4. ERR-ADMIN-005: рассылка новостей — только владелец ──
create or replace function public.admin_send_news(p_title text, p_text text, p_key text, p_dry_run boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_text text := trim(coalesce(p_text, ''));
  v_key text := trim(coalesce(p_key, ''));
  v_count integer;
begin
  perform public.admin_require('owner');
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

-- ── 5. ERR-ADMIN-006: запись в app_settings / financial_configs / settings — только владелец ──
-- Чтение (<t>_read, всем) не меняется: курсы, пауза оплат и реквизиты читаются клиентами. Бот пишет сервисным ключом — RLS его не касается.
drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin on public.app_settings for all to authenticated
  using ((select public.app_is_owner())) with check ((select public.app_is_owner()));

drop policy if exists financial_configs_admin on public.financial_configs;
create policy financial_configs_admin on public.financial_configs for all to authenticated
  using ((select public.app_is_owner())) with check ((select public.app_is_owner()));

drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for all to authenticated
  using ((select public.app_is_owner())) with check ((select public.app_is_owner()));

-- Две настройки, которые правит админ (не только владелец): окно дропа и ссылки/партнёры отзывов. Остальные ключи сюда не пройдут.
-- p_rows: [{"key": "...", "value": ...}]. Значения drop_* — строки, как их читает бот.
create or replace function public.admin_save_content_settings(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e jsonb;
  v_key text;
  v_val jsonb;
  v_txt text;
  v_n integer := 0;
begin
  perform public.admin_require('admin');
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 10 then
    raise exception 'Нечего сохранять';
  end if;
  for e in select * from jsonb_array_elements(p_rows) loop
    v_key := e ->> 'key';
    v_val := e -> 'value';
    v_txt := v_val #>> '{}';
    if v_key = 'reviews_config' then
      if jsonb_typeof(v_val) is distinct from 'object' or length(v_val::text) > 5000 then
        raise exception 'Настройки отзывов указаны неверно';
      end if;
    elsif v_key = 'drop_weekday' then
      if jsonb_typeof(v_val) is distinct from 'string' or v_txt !~ '^[1-7]$' then raise exception 'День недели указан неверно'; end if;
    elsif v_key = 'drop_hour' then
      if jsonb_typeof(v_val) is distinct from 'string' or v_txt !~ '^([0-9]|1[0-9]|2[0-3])$' then raise exception 'Час начала — от 0 до 23'; end if;
    elsif v_key = 'drop_minute' then
      if jsonb_typeof(v_val) is distinct from 'string' or v_txt !~ '^([0-9]|[1-5][0-9])$' then raise exception 'Минуты начала — от 0 до 59'; end if;
    elsif v_key = 'drop_duration_min' then
      if jsonb_typeof(v_val) is distinct from 'string' or v_txt !~ '^[0-9]{1,4}$' or v_txt::integer not between 1 and 1440 then
        raise exception 'Длительность — от 1 до 1440 минут';
      end if;
    elsif v_key = 'drop_enabled' then
      if jsonb_typeof(v_val) is distinct from 'string' or v_txt not in ('true', 'false') then raise exception 'Включение дропа указано неверно'; end if;
    else
      raise exception 'Эту настройку админ менять не может';
    end if;
    insert into public.settings (key, value, updated_at) values (v_key, v_val, now())
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'saved', v_n);
end $$;
revoke all on function public.admin_save_content_settings(jsonb) from public, anon;
grant execute on function public.admin_save_content_settings(jsonb) to authenticated;
