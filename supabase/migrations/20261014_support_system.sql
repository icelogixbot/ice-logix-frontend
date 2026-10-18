-- ==============================================================================
-- ICE LOGIX: Dedicated Support Service Migration
-- Tables: support_tickets, support_messages
-- ==============================================================================

-- 1. Таблица support_tickets (Обращения в службу поддержки)
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    user_name TEXT,
    user_handle TEXT,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'closed'
    subject TEXT,
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    unread_by_operator BOOLEAN NOT NULL DEFAULT true,
    unread_by_client BOOLEAN NOT NULL DEFAULT false,
    operator_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMPTZ
);

-- Индексы для моментального поиска
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated ON support_tickets(last_message_at DESC);

-- 2. Таблица support_messages (История переписки)
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL, -- 'client', 'operator', 'system'
    sender_id BIGINT NOT NULL,
    sender_name TEXT,
    text TEXT NOT NULL,
    media_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Индекс по тикету для мгновенной загрузки чата
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id, created_at ASC);

-- 3. Row Level Security (RLS)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Политики для support_tickets
DROP POLICY IF EXISTS "Enable all for support_tickets" ON support_tickets;
CREATE POLICY "Enable all for support_tickets" ON support_tickets 
    FOR ALL USING (true) WITH CHECK (true);

-- Политики для support_messages
DROP POLICY IF EXISTS "Enable all for support_messages" ON support_messages;
CREATE POLICY "Enable all for support_messages" ON support_messages 
    FOR ALL USING (true) WITH CHECK (true);
