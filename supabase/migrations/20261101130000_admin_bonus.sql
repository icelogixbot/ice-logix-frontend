-- Админка, «Витрина» → Бонусы: товары за ICE и выдача заказов через серверные функции (с журналом).
-- Все функции: security definer, search_path = public, первая строка — admin_require.
-- Откат: supabase/rollback/20261101130000_admin_bonus_rollback.sql

-- Товары и заказы к выдаче одним запросом.
create or replace function public.admin_bonus_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_require('admin');
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.sort_order, i.created_at) from public.bonus_shop_items i), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'user_id', o.user_id, 'item_title', o.item_title, 'category', o.category, 'price_ice', o.price_ice,
        'contact_payload', o.contact_payload, 'status', o.status, 'created_at', o.created_at,
        'client', coalesce(nullif(u.full_name, ''), nullif(u.username, ''), o.user_id::text), 'username', u.username
      ) order by o.created_at)
      from public.bonus_shop_orders o left join public.users u on u.user_id = o.user_id
      where o.status = 'PENDING'), '[]'::jsonb));
end $$;

-- Создание и правка товара (p_id null — новый). stock: -1 — без ограничения.
create or replace function public.admin_bonus_item_save(
  p_id uuid, p_title text, p_description text, p_category text, p_price numeric, p_stock integer, p_active boolean, p_badge text, p_sort integer
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_cat text := lower(trim(coalesce(p_category, '')));
  v_id uuid;
begin
  perform public.admin_require('admin');
  if length(v_title) < 2 or length(v_title) > 100 then
    raise exception 'Название: от 2 до 100 символов';
  end if;
  if v_cat not in ('coupons', 'mobile', 'merch', 'gadgets') then
    raise exception 'Выберите категорию';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'Цена указана неверно';
  end if;
  if p_stock is null or p_stock < -1 then
    raise exception 'Остаток указан неверно';
  end if;
  if p_id is null then
    insert into public.bonus_shop_items (title, description, category, price_ice, stock, is_active, badge, sort_order)
    values (v_title, nullif(trim(coalesce(p_description, '')), ''), v_cat, round(p_price, 2), p_stock, coalesce(p_active, true),
            nullif(trim(coalesce(p_badge, '')), ''), coalesce(p_sort, 0))
    returning id into v_id;
  else
    update public.bonus_shop_items
       set title = v_title, description = nullif(trim(coalesce(p_description, '')), ''), category = v_cat, price_ice = round(p_price, 2),
           stock = p_stock, is_active = coalesce(p_active, true), badge = nullif(trim(coalesce(p_badge, '')), ''), sort_order = coalesce(p_sort, 0)
     where id = p_id returning id into v_id;
    if v_id is null then
      raise exception 'Товар не найден';
    end if;
  end if;
  perform public.admin_log('bonus_item_save', 'bonus_item', v_id::text,
    jsonb_build_object('title', v_title, 'category', v_cat, 'price', p_price, 'stock', p_stock, 'active', coalesce(p_active, true)));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Заказ выдан (p_done = true) или отменён с возвратом ICE и остатка (p_done = false). Повтор по уже закрытому заказу — ошибка.
create or replace function public.admin_bonus_order_close(p_id uuid, p_done boolean, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o public.bonus_shop_orders;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  perform public.admin_require('admin');
  select * into o from public.bonus_shop_orders where id = p_id for update;
  if not found then
    raise exception 'Заказ не найден';
  end if;
  if o.status <> 'PENDING' then
    raise exception 'Заказ уже закрыт';
  end if;
  if coalesce(p_done, false) then
    update public.bonus_shop_orders set status = 'COMPLETED', completed_at = now(), operator_id = public.app_uid(), admin_notes = v_note where id = p_id;
  else
    if o.price_ice > 0 then
      perform public.wallet_move(o.user_id, o.price_ice, 'CREDIT', 'BONUS_SHOP_REFUND', 'REFUND', null, null, 'bonus_refund:' || o.id);
    end if;
    if o.item_id is not null then
      update public.bonus_shop_items set stock = stock + 1 where id = o.item_id and stock >= 0;
    end if;
    update public.bonus_shop_orders set status = 'CANCELLED', completed_at = now(), operator_id = public.app_uid(), admin_notes = v_note where id = p_id;
  end if;
  perform public.admin_log(case when coalesce(p_done, false) then 'bonus_order_done' else 'bonus_order_cancel' end, 'bonus_order', p_id::text,
    jsonb_build_object('user_id', o.user_id, 'item', o.item_title, 'price_ice', o.price_ice, 'note', v_note));
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.admin_bonus_overview(), public.admin_bonus_item_save(uuid, text, text, text, numeric, integer, boolean, text, integer),
  public.admin_bonus_order_close(uuid, boolean, text) from public, anon;
grant execute on function public.admin_bonus_overview(), public.admin_bonus_item_save(uuid, text, text, text, numeric, integer, boolean, text, integer),
  public.admin_bonus_order_close(uuid, boolean, text) to authenticated;
