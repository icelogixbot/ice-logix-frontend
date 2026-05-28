-- Add columns for cashback and photos to reviews
ALTER TABLE "public"."reviews" 
ADD COLUMN IF NOT EXISTS "photo_urls" text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS "cashback_granted" boolean DEFAULT false;

-- Create bucket for review photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the review-photos bucket
CREATE POLICY "Public Access to Review Photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'review-photos');

CREATE POLICY "Users can upload review photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'review-photos');
