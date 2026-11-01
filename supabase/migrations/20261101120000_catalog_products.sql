-- Авто-каталог товаров (ADR-032). Карточки собирает и обновляет работник Pinduoduo на ноуте.
-- Читать опубликованные карточки может любой; писать — только работник (секретный ключ, обходит RLS).

create table if not exists public.catalog_products (
  id                    bigserial primary key,
  source                text not null default 'pdd',
  goods_id              text not null,
  url                   text,
  title_ru              text,
  title_cn              text,
  category              text,
  brand                 text,
  image_url             text,
  price_cny             numeric(10,2),
  price_prev_cny        numeric(10,2),
  data                  jsonb not null default '{}'::jsonb,   -- полная карточка (варианты, фото, отзывы)
  status                text not null default 'published' check (status in ('published', 'hidden', 'dead')),
  recheck_requested_at  timestamptz,                          -- клиент открыл карточку: цену надо перепроверить
  price_checked_at      timestamptz not null default now(),
  price_changed_at      timestamptz,
  check_fails           int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (source, goods_id)
);

create index if not exists catalog_products_pub_idx on public.catalog_products (status, created_at desc);
create index if not exists catalog_products_stale_idx on public.catalog_products (price_checked_at) where status = 'published';
create index if not exists catalog_products_recheck_idx on public.catalog_products (recheck_requested_at) where recheck_requested_at is not null;

alter table public.catalog_products enable row level security;

drop policy if exists catalog_products_read on public.catalog_products;
create policy catalog_products_read on public.catalog_products
  for select to anon, authenticated
  using (status = 'published');
-- Политик на запись нет намеренно.

-- Клиент открыл карточку или считает заказ: просим работника перепроверить цену (не чаще раза в 5 минут).
create or replace function public.catalog_request_recheck(p_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.catalog_products
     set recheck_requested_at = now()
   where id = p_id
     and status = 'published'
     and price_checked_at < now() - interval '5 minutes'
     and (recheck_requested_at is null or recheck_requested_at < now() - interval '5 minutes');
$$;

revoke all on function public.catalog_request_recheck(bigint) from public;
grant execute on function public.catalog_request_recheck(bigint) to anon, authenticated;
revoke insert, update, delete, truncate on public.catalog_products from anon, authenticated;
