-- Create insurance_claims table for order refund claims
CREATE TABLE IF NOT EXISTS insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id bigint,
  description text NOT NULL,
  status text DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  rejection_reason text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;

-- Allow public CRUD access for ease of MVP development
CREATE POLICY "Enable all actions for insurance_claims" ON insurance_claims FOR ALL USING (true) WITH CHECK (true);

-- Create legit_check_requests table for paid legitimacy checks
CREATE TABLE IF NOT EXISTS legit_check_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint,
  brand text NOT NULL,
  model text NOT NULL,
  photos text[] NOT NULL,
  status text DEFAULT 'pending', -- 'pending' | 'original' | 'fake'
  comments text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE legit_check_requests ENABLE ROW LEVEL SECURITY;

-- Allow public CRUD access for ease of MVP development
CREATE POLICY "Enable all actions for legit_check_requests" ON legit_check_requests FOR ALL USING (true) WITH CHECK (true);
