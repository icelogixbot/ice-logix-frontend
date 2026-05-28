import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Canonical statuses used across index.html / pricing engine / order tracker.
// We keep `ordered` and `at_warehouse` as aliases so legacy ShopByShop webhook
// payloads continue to work after the rename to `bought` / `on_sklad_cn`.
const statusMap: Record<string, string> = {
  'pending': '⏳ Ожидает оплаты',
  'paid': '💵 Оплачен (1 часть)',
  'bought': '🛒 Выкуплен с площадки',
  'ordered': '🛒 Выкуплен с площадки',       // alias for bought
  'on_sklad_cn': '📦 На складе в Китае',
  'at_warehouse': '📦 На складе в Китае',   // alias for on_sklad_cn
  'in_transit': '✈️ В пути в Минск',
  'awaiting_payment': '⏳ Ожидает доплаты',
  'paid_second': '✅ Оплачен полностью',
  'in_belarus': '🏢 Прибыл на наш склад',
  'dispatched': '🚚 Отправлен (СДЭК/Белпочта)',
  'delivered': '🎉 Готов к выдаче',
  'cancelled': '❌ Отменён'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      console.warn('TELEGRAM_BOT_TOKEN is not set. Cannot send notification.')
      return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN not configured' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 so we don't crash triggers if token is missing
      })
    }

    const payload = await req.json()
    // We expect { order_id: string, new_status: string }
    const { order_id, new_status } = payload
    
    if (!order_id || !new_status) {
      return new Response(JSON.stringify({ error: 'Missing order_id or new_status' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      })
    }

    // Fetch the order to get the user_id (Telegram ID)
    const { data: orderData, error: orderErr } = await supabaseClient
      .from('orders')
      .select('user_id, id')
      .eq('id', order_id)
      .single()
      
    if (orderErr || !orderData) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404 
      })
    }

    const telegramId = orderData.user_id
    if (!telegramId) {
       return new Response(JSON.stringify({ error: 'No user_id associated with order' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      })
    }

    const readableStatus = statusMap[new_status] || new_status
    const shortOrderId = orderData.id.slice(0, 8).toUpperCase()
    
    const message = `🔔 *Обновление статуса заказа*\n\nВаш заказ \`#${shortOrderId}\` изменил статус:\n\n👉 **${readableStatus}**\n\n_Отслеживайте детали в приложении ICE LOGIX!_ 🧊`
    
    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: 'Markdown'
      })
    })

    const tgData = await tgResponse.json()
    
    if (!tgData.ok) {
      console.error('Telegram API error:', tgData)
      return new Response(JSON.stringify({ error: 'Failed to send telegram message', details: tgData }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Edge Function error:', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: errMsg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
