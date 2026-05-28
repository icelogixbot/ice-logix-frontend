-- Create logistics_events table to track order movements via ShopByShop or other partners
CREATE TABLE IF NOT EXISTS public.logistics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    status_code TEXT NOT NULL,
    location TEXT,
    description TEXT,
    partner_id TEXT, -- e.g., 'shopbyshop'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookups by order
CREATE INDEX IF NOT EXISTS idx_logistics_events_order_id ON public.logistics_events(order_id);

-- Enable RLS
ALTER TABLE public.logistics_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view logistics events for their own orders"
    ON public.logistics_events
    FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM public.orders WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Service role can manage logistics events"
    ON public.logistics_events
    USING (true)
    WITH CHECK (true);
