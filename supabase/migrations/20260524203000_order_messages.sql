-- Create order_messages table for ticket chat support
CREATE TABLE IF NOT EXISTS order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id bigint,
  sender_role text NOT NULL, -- 'client' | 'manager'
  message_text text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

-- Allow public CRUD access for ease of MVP development
CREATE POLICY "Enable all actions for order_messages" ON order_messages FOR ALL USING (true) WITH CHECK (true);
