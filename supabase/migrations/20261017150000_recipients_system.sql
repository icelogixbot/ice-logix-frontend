-- ====================================================================
-- ICE LOGIX: Миграция 20261017_recipients_system.sql
-- Таблица получателей для распределения таможенных лимитов (200€ / 31кг)
-- ====================================================================

CREATE TABLE IF NOT EXISTS recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    full_name TEXT NOT NULL,
    passport TEXT NOT NULL,
    id_number TEXT,
    issue_date DATE,
    issued_by TEXT,
    phone TEXT,
    third_party_consent BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Обеспечение наличия всех необходимых колонок
ALTER TABLE recipients 
    ADD COLUMN IF NOT EXISTS id_number TEXT,
    ADD COLUMN IF NOT EXISTS issue_date DATE,
    ADD COLUMN IF NOT EXISTS issued_by TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS third_party_consent BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_recipients_user_id ON recipients(user_id);

ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own recipients" ON recipients;
    CREATE POLICY "Users can view own recipients" ON recipients
        FOR SELECT
        USING (true);

    DROP POLICY IF EXISTS "Users can insert own recipients" ON recipients;
    CREATE POLICY "Users can insert own recipients" ON recipients
        FOR INSERT
        WITH CHECK (true);

    DROP POLICY IF EXISTS "Users can update own recipients" ON recipients;
    CREATE POLICY "Users can update own recipients" ON recipients
        FOR UPDATE
        USING (true);

    DROP POLICY IF EXISTS "Users can delete own recipients" ON recipients;
    CREATE POLICY "Users can delete own recipients" ON recipients
        FOR DELETE
        USING (true);
END $$;
