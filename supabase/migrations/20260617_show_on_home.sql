-- Migration: add show_on_home flag to products and marketplaces
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false;

ALTER TABLE marketplaces
  ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false;

-- Optional: create indexes for fast home-page queries
CREATE INDEX IF NOT EXISTS idx_products_show_on_home ON products(show_on_home) WHERE show_on_home = true;
CREATE INDEX IF NOT EXISTS idx_marketplaces_show_on_home ON marketplaces(show_on_home) WHERE show_on_home = true;
