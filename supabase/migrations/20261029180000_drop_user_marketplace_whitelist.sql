-- Функция «Маркетплейсы» удалена из Mini App 2026-10-29, таблица пустая и была открыта всем (политика USING true).
-- Из списка удаления аккаунта в telegram-auth убрана до этой миграции.
drop table if exists public.user_marketplace_whitelist;
