-- Откат авто-каталога (ADR-032)
drop function if exists public.catalog_request_recheck(bigint);
drop table if exists public.catalog_products;
