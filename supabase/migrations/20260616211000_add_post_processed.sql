-- Migration to add post_processed column to reviews
-- Path: supabase/migrations/20260616211000_add_post_processed.sql

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS post_processed boolean DEFAULT false;
