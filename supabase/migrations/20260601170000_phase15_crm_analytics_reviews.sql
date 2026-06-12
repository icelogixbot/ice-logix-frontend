-- ============================================================================
-- ФАЗА 15: CRM-аналитика, RFM-сегментация, авто-сбор отзывов, win-back
-- Один консолидированный запрос: поля users(CRM), orders(delivered/review),
-- триггеры авто-проставления дат, VIEW для аналитики и RFM.
-- ============================================================================

-- 1) CRM-метрики на пользователе -------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_activity_date timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS total_spent        numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS orders_count       integer       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_winback_sent_at timestamptz;

-- 2) Метки жизненного цикла заказа ----------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivered_at        timestamptz,
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;

-- 3) Авто-проставление delivered_at при переходе статуса в 'delivered' -----------
CREATE OR REPLACE FUNCTION public.fn_stamp_delivered_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    NEW.delivered_at := COALESCE(NEW.delivered_at, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stamp_delivered_at ON public.orders;
CREATE TRIGGER trg_stamp_delivered_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_stamp_delivered_at();

-- 4) Пересчёт CRM-метрик пользователя при изменении заказов ----------------------
CREATE OR REPLACE FUNCTION public.fn_recalc_user_metrics()
RETURNS trigger AS $$
DECLARE
  uid bigint := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  UPDATE public.users u
  SET
    total_spent  = COALESCE(agg.spent, 0),
    orders_count = COALESCE(agg.cnt, 0),
    last_activity_date = GREATEST(COALESCE(u.last_activity_date, u.created_at), COALESCE(agg.last_dt, u.created_at))
  FROM (
    SELECT
      SUM(o.total_byn) FILTER (WHERE o.status = 'delivered') AS spent,
      COUNT(*)        FILTER (WHERE o.status = 'delivered') AS cnt,
      MAX(o.created_at) AS last_dt
    FROM public.orders o
    WHERE o.user_id = uid
  ) agg
  WHERE u.user_id = uid;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_user_metrics ON public.orders;
CREATE TRIGGER trg_recalc_user_metrics
  AFTER INSERT OR UPDATE OF status, total_byn OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_recalc_user_metrics();

-- 5) Индексы под аналитические запросы ------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_status_created   ON public.orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at     ON public.orders(delivered_at) WHERE status = 'delivered';
CREATE INDEX IF NOT EXISTS idx_orders_user_status      ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_users_last_activity     ON public.users(last_activity_date);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id        ON public.reviews(order_id);

-- 6) VIEW: выручка/заказы/конверсия по дням -------------------------------------
CREATE OR REPLACE VIEW public.v_daily_analytics AS
SELECT
  date_trunc('day', o.created_at)::date                                   AS day,
  COUNT(*)                                                                AS orders_total,
  COUNT(*) FILTER (WHERE o.status = 'delivered')                          AS orders_delivered,
  COUNT(*) FILTER (WHERE o.status = 'cancelled')                          AS orders_cancelled,
  COALESCE(SUM(o.total_byn) FILTER (WHERE o.status = 'delivered'), 0)     AS revenue_byn,
  COALESCE(SUM(o.price_byn) FILTER (WHERE o.status = 'delivered'), 0)*0.15 AS profit_byn,
  COUNT(DISTINCT o.user_id)                                               AS buyers,
  ROUND(
    COUNT(*) FILTER (WHERE o.status = 'delivered')::numeric
    / NULLIF(COUNT(*), 0) * 100, 1)                                       AS conversion_pct
FROM public.orders o
WHERE o.status <> 'deleted' AND o.archived_at IS NULL
GROUP BY 1
ORDER BY 1;

-- 7) VIEW: RFM-сегментация клиентов ---------------------------------------------
-- Recency = дней с последнего заказа, Frequency = кол-во доставленных,
-- Monetary = суммарная выручка. Сегмент рассчитывается простыми порогами.
CREATE OR REPLACE VIEW public.v_user_rfm AS
WITH base AS (
  SELECT
    u.user_id,
    u.full_name,
    u.username,
    u.created_at,
    COALESCE(u.total_spent, 0)  AS monetary,
    COALESCE(u.orders_count, 0) AS frequency,
    EXTRACT(DAY FROM now() - COALESCE(
      (SELECT MAX(o.created_at) FROM public.orders o WHERE o.user_id = u.user_id),
      u.created_at))::int        AS recency_days
  FROM public.users u
  WHERE u.role NOT IN ('admin', 'owner') OR u.role IS NULL
)
SELECT
  b.*,
  CASE
    WHEN b.frequency = 0 AND b.recency_days <= 14            THEN 'Новичок'
    WHEN b.monetary >= 1000 AND b.recency_days <= 60         THEN 'VIP'
    WHEN b.frequency >= 2 AND b.recency_days <= 45           THEN 'Постоянный'
    WHEN b.recency_days > 30 AND b.frequency >= 1            THEN 'Спящий'
    WHEN b.recency_days > 60                                 THEN 'Потерянный'
    ELSE 'Активный'
  END AS segment
FROM base b;

-- 8) Бэкофилл существующих данных одним проходом --------------------------------
UPDATE public.users u
SET
  total_spent  = COALESCE(agg.spent, 0),
  orders_count = COALESCE(agg.cnt, 0),
  last_activity_date = GREATEST(COALESCE(u.last_activity_date, u.created_at), COALESCE(agg.last_dt, u.created_at))
FROM (
  SELECT o.user_id,
         SUM(o.total_byn) FILTER (WHERE o.status = 'delivered') AS spent,
         COUNT(*)        FILTER (WHERE o.status = 'delivered') AS cnt,
         MAX(o.created_at) AS last_dt
  FROM public.orders o
  GROUP BY o.user_id
) agg
WHERE u.user_id = agg.user_id;

UPDATE public.orders
SET delivered_at = COALESCE(delivered_at, updated_at, created_at)
WHERE status = 'delivered' AND delivered_at IS NULL;
