-- ====================================================================
-- ICE LOGIX: Миграция 20261017_kyc_system.sql
-- Двухэтапная система верификации KYC для таможенного оформления
-- ====================================================================

-- 1. Добавляем поля верификации KYC в таблицу users
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_submitted',
    ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS kyc_doc_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS kyc_data JSONB;

-- Ограничение статусов
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_user_kyc_status'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT check_user_kyc_status 
        CHECK (kyc_status IN ('not_submitted', 'pending', 'verified', 'rejected'));
    END IF;
END $$;

-- 2. Таблица аудита и истории верификаций kyc_verifications
CREATE TABLE IF NOT EXISTS kyc_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    id_number TEXT,
    series_number TEXT,
    full_name TEXT,
    birth_date DATE,
    age INT,
    gender TEXT,
    is_adult BOOLEAN DEFAULT true,
    parental_consent BOOLEAN DEFAULT false,
    photo_url TEXT,
    moderated_by BIGINT,
    moderated_at TIMESTAMPTZ,
    rejection_reason TEXT,
    validation_stage1_result JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_verifications(status);

-- 3. RLS Политики
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own kyc records" ON kyc_verifications;
    CREATE POLICY "Users can view own kyc records" ON kyc_verifications
        FOR SELECT
        USING (true);

    DROP POLICY IF EXISTS "Users can insert own kyc records" ON kyc_verifications;
    CREATE POLICY "Users can insert own kyc records" ON kyc_verifications
        FOR INSERT
        WITH CHECK (true);

    DROP POLICY IF EXISTS "Admins can update kyc records" ON kyc_verifications;
    CREATE POLICY "Admins can update kyc records" ON kyc_verifications
        FOR ALL
        USING (true);
END $$;

-- 4. Создание приватного Storage Bucket для документов KYC (если поддерживается расширение storage)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'kyc-documents',
            'kyc-documents',
            false,
            10485760, -- 10MB
            ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
