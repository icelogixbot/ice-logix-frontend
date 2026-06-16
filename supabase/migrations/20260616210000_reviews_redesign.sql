-- Database migration for Reviews Redesign
-- Path: supabase/migrations/20260616210000_reviews_redesign.sql

-- 1) Create review_actions table
CREATE TABLE IF NOT EXISTS public.review_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  category text NOT NULL, -- 'orders', 'promotions', 'dropshipping', 'referral', 'advertising', 'academy', 'legitcheck', 'partnership'
  target_id text NOT NULL, -- e.g., order_id, payout_id, etc.
  title text NOT NULL, -- e.g. 'Заказ №4589 (Nike)'
  details jsonb NOT NULL DEFAULT '{}'::jsonb, -- e.g. {product: 'Nike', size: '42', delivery: 'Минск', term: '12 дней'}
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed'
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz
);

-- Indexes for performance & unique constraints
CREATE INDEX IF NOT EXISTS idx_review_actions_user_status ON public.review_actions(user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_actions_category_target ON public.review_actions(category, target_id);

-- 2) Modify reviews table
ALTER TABLE public.reviews 
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'orders',
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_action_id uuid REFERENCES public.review_actions(id) ON DELETE SET NULL;

-- 3) Create review_likes table (prevents double liking & counts efficiently)
CREATE TABLE IF NOT EXISTS public.review_likes (
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  PRIMARY KEY (review_id, user_id)
);

-- 4) Create social_media_queue for autosharing UGC
CREATE TABLE IF NOT EXISTS public.social_media_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  platform text NOT NULL, -- 'vk', 'instagram', 'x', 'tiktok'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- 5) Default configuration settings for reviews
INSERT INTO public.settings (key, value)
VALUES (
  'reviews_config',
  '{
    "yandex_maps_link": "https://yandex.by/maps/org/ice_logix/12345678",
    "google_maps_link": "https://maps.google.com/?cid=12345678",
    "gis_2_link": "https://2gis.by/minsk/firm/12345678",
    "telegram_group_link": "https://t.me/icelogix_reviews",
    "social_media_links": {
      "vk": "https://vk.com/icelogix",
      "instagram": "https://instagram.com/icelogix",
      "x": "https://x.com/icelogix",
      "tiktok": "https://tiktok.com/@icelogix"
    },
    "bonus_internal_pct": 2.0,
    "bonus_external_text_pct": 1.0,
    "bonus_external_media_pct": 3.0,
    "partner_user_ids": [],
    "telegram_group_chat_id": "",
    "topic_ids": {
      "all": "",
      "orders": "",
      "promotions": "",
      "dropshipping": "",
      "referral": "",
      "advertising": "",
      "academy": "",
      "legitcheck": "",
      "partnership": ""
    }
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 6) Trigger to create a review action when an order becomes 'delivered'
CREATE OR REPLACE FUNCTION public.fn_create_review_action_on_delivery()
RETURNS trigger AS $$
DECLARE
  prod_title text;
  prod_size text;
  deliv_city text;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    -- Extract product info from items JSONB array if exists
    IF NEW.items IS NOT NULL AND jsonb_array_length(NEW.items) > 0 THEN
      prod_title := COALESCE(NEW.items->0->>'title', NEW.items->0->>'title_translated', 'Товар');
      prod_size := COALESCE(NEW.items->0->>'size', NEW.items->0->>'product_size', 'не указан');
    ELSE
      prod_title := 'Товар';
      prod_size := 'не указан';
    END IF;

    -- Extract delivery location
    deliv_city := COALESCE(split_part(NEW.tracking_number_by, '|', 1), 'Минск');

    -- Insert review action
    INSERT INTO public.review_actions (user_id, category, target_id, title, details, status)
    VALUES (
      NEW.user_id,
      'orders',
      NEW.id::text,
      'Заказ №' || substring(NEW.id::text from 1 for 8),
      jsonb_build_object(
        'product', prod_title,
        'size', prod_size,
        'delivery', trim(deliv_city),
        'term', '12 дней'
      ),
      'pending'
    )
    ON CONFLICT (category, target_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_review_action_on_delivery ON public.orders;
CREATE TRIGGER trg_create_review_action_on_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_create_review_action_on_delivery();

-- 7) Trigger to sync like count from review_likes to reviews table
CREATE OR REPLACE FUNCTION public.fn_sync_review_likes_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reviews
    SET likes_count = COALESCE(likes_count, 0) + 1
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reviews
    SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
    WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_review_likes_count ON public.review_likes;
CREATE TRIGGER trg_sync_review_likes_count
  AFTER INSERT OR DELETE ON public.review_likes
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_review_likes_count();
