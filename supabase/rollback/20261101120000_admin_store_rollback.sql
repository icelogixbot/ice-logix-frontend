-- Откат этапа «Витрина»: убирает функции админки и возвращает прежнюю check_promocode (без срока и лимита).
-- Колонки promocodes.expires_at / usage_limit удаляются вместе со своими значениями.
drop function if exists public.admin_promocodes();
drop function if exists public.admin_promocode_save(uuid, text, text, numeric, boolean, timestamptz, integer);
drop function if exists public.admin_send_news(text, text, text, boolean);

create or replace function public.check_promocode(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object('valid', true, 'id', id, 'code', code, 'discount_type', discount_type, 'discount_value', discount_value)
       from public.promocodes where upper(code) = upper(trim(p_code)) and coalesce(is_active, true) limit 1),
    jsonb_build_object('valid', false))
$$;

drop function if exists public._promo_used(text);
alter table public.promocodes drop column if exists expires_at;
alter table public.promocodes drop column if exists usage_limit;
