-- Create user_marketplace_whitelist table for custom platform routing
CREATE TABLE IF NOT EXISTS user_marketplace_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  platform_slug text NOT NULL,
  enabled boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, platform_slug)
);

-- Enable RLS
ALTER TABLE user_marketplace_whitelist ENABLE ROW LEVEL SECURITY;

-- Allow public CRUD access for MVP simplicity
CREATE POLICY "Enable all actions for whitelist" ON user_marketplace_whitelist FOR ALL USING (true) WITH CHECK (true);
