-- Enable extensions
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Add new column for vault-encrypted passport
ALTER TABLE users ADD COLUMN IF NOT EXISTS vault_passport text;

-- Create functions for secure passport storage
CREATE OR REPLACE FUNCTION save_passport_secure(p_user_id bigint, p_passport text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key_id uuid;
  v_encrypted bytea;
BEGIN
  -- Ensure key exists
  SELECT id INTO v_key_id FROM pgsodium.key WHERE name = 'passport_key' LIMIT 1;
  IF NOT FOUND THEN
    SELECT id INTO v_key_id FROM pgsodium.create_key(name := 'passport_key');
  END IF;

  -- Encrypt
  v_encrypted := pgsodium.crypto_aead_det_encrypt(
    convert_to(p_passport, 'utf8'),
    convert_to(p_user_id::text, 'utf8'),
    v_key_id
  );

  UPDATE users 
  SET vault_passport = encode(v_encrypted, 'base64')
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_passport_secure(p_user_id bigint)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key_id uuid;
  v_encrypted text;
  v_decrypted bytea;
BEGIN
  SELECT vault_passport INTO v_encrypted FROM users WHERE user_id = p_user_id;
  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_key_id FROM pgsodium.key WHERE name = 'passport_key' LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  v_decrypted := pgsodium.crypto_aead_det_decrypt(
    decode(v_encrypted, 'base64'),
    convert_to(p_user_id::text, 'utf8'),
    v_key_id
  );

  RETURN convert_from(v_decrypted, 'utf8');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Migrate existing encrypted passports
-- Since old passports were encrypted with frontend JS crypto, we cannot decrypt them in SQL.
-- The user will just re-enter their passport, or frontend will re-encrypt upon next login.
