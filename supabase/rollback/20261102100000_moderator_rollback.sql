-- Откат модератора: удаляет функции и таблицы mod_* (данные модерации пропадут).
drop function if exists public.admin_mod_overview();
drop function if exists public.admin_mod_chat(bigint);
drop function if exists public.admin_mod_chat_save(bigint, jsonb, boolean);
drop function if exists public.admin_mod_apply_all(jsonb);
drop function if exists public.admin_mod_log(bigint, integer, integer, bigint);
drop function if exists public.admin_mod_words_list(bigint);
drop function if exists public.admin_mod_word_add(bigint, text, text);
drop function if exists public.admin_mod_word_del(bigint);
drop function if exists public.admin_mod_gban_list();
drop function if exists public.admin_mod_gban_add(bigint, text);
drop function if exists public.admin_mod_gban_del(bigint);
drop function if exists public.admin_mod_unban(bigint, bigint);
drop table if exists public.mod_queue, public.mod_captcha, public.mod_gbans, public.mod_words, public.mod_warns, public.mod_actions, public.mod_chats;
