import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      sbSecretKey() ?? ''
    )

    const payload = await req.json()
    // Expected payload from ShopByShop:
    // {
    //   "order_id": "uuid",
    //   "status": "in_transit",
    //   "location": "Guangzhou Warehouse",
    //   "description": "Package received and sorted."
    // }

    const { order_id, status, location, description } = payload

    if (!order_id || !status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Insert into logistics_events
    const { error: eventError } = await supabaseClient
      .from('logistics_events')
      .insert({
        order_id,
        status_code: status,
        location: location || '',
        description: description || '',
        partner_id: 'shopbyshop'
      })

    if (eventError) {
      throw eventError
    }

    // 2. Update orders.status (optional mapping logic can be added here)
    const { error: orderError } = await supabaseClient
      .from('orders')
      .update({ status })
      .eq('id', order_id)

    if (orderError) {
      throw orderError
    }

    // 3. Trigger notify-status Edge Function
    // We don't await this strictly so we don't block the webhook response
    supabaseClient.functions.invoke('notify-status', {
      body: { order_id, new_status: status }
    }).catch(err => console.error('Failed to invoke notify-status:', err))

    return new Response(
      JSON.stringify({ success: true, message: 'Logistics event recorded' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: errMsg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

// Ключи Supabase: новый формат (sb_secret_ / sb_publishable_), а если его нет, прежний (service_role / anon)
function sbSecretKey(): string | undefined {
  try {
    const key = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"];
    if (key) return key;
  } catch { /* новой переменной нет, берём прежний ключ */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

function sbPublishableKey(): string | undefined {
  try {
    const key = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"];
    if (key) return key;
  } catch { /* новой переменной нет, берём прежний ключ */ }
  return Deno.env.get("SUPABASE_ANON_KEY");
}
