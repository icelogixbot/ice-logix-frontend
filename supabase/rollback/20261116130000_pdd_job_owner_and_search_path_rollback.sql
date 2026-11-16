-- Откат 20261116130000: старая pdd_job_create (p_user_id от клиента) и search_path по умолчанию.
alter function public.ice_review_has_media(jsonb) reset search_path;
alter function public.ice_review_has_video(jsonb) reset search_path;
alter function public.reviews_circle_mode_guard() reset search_path;
-- Тело старой функции: как в миграции 20261116130000, но без блока
-- «Владелец задачи — тот, кто вошёл» и без переменной v_uid.
