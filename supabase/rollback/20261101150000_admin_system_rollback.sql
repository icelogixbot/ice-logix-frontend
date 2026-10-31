-- Откат: убирает сводку «Системы» (данные не трогает).
drop function if exists public.admin_system_overview();
