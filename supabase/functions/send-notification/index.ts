// ICE LOGIX — send-notification v1.0
//
// Generic Telegram bot notification dispatcher. Accepts:
//   {
//     "user_id":  number,   // Telegram chat id (users.user_id)
//     "message":  string,   // arbitrary text — HTML tags are stripped
//     "order_id": string?   // optional, currently unused but reserved for analytics
//   }
//
// The frontend (`index.html`) calls this function from three places:
//   1. Admin order-status change → rich status update for the customer.
//   2. Insurance claim approval → notify customer payout was issued.
//   3. Account recovery → send the one-time recovery code via Telegram.
//
// Why this exists separately from `notify-status`:
//   `notify-status` reads order context from DB and formats a canned message.
//   `send-notification` is the fallback for cases where the caller already
//   produced a custom message (recovery codes, ad-hoc admin replies).
//
// Required env vars:
//   TELEGRAM_BOT_TOKEN — bot token used to call Telegram Bot API.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Strip HTML tags + collapse whitespace so the Telegram client renders a
// clean plain-text message regardless of what the caller passes in.
function htmlToText(input: string): string {
  if (!input) return ''
  return input
    // Drop full elements that never make sense in chat (svg, style, script)
    .replace(/<(svg|style|script)[\s\S]*?<\/\1>/gi, '')
    // Self-closing / empty tags
    .replace(/<[^>]+>/g, '')
    // HTML entities we commonly emit
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse whitespace introduced by removed tags
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      console.warn('TELEGRAM_BOT_TOKEN is not set. Skipping Telegram delivery.')
      // Return 200 so callers do not crash database triggers / admin flows.
      return new Response(
        JSON.stringify({ success: false, skipped: true, reason: 'TELEGRAM_BOT_TOKEN missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    const payload = await req.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const { user_id, message } = payload as { user_id?: number | string; message?: string; order_id?: string }
    if (!user_id || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id or message' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const text = htmlToText(String(message))
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Empty message after sanitisation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: user_id,
        text,
        disable_web_page_preview: true,
      }),
    })
    const tgData = await tgResponse.json()
    if (!tgData.ok) {
      console.error('Telegram API error:', tgData)
      return new Response(
        JSON.stringify({ error: 'Failed to send telegram message', details: tgData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('send-notification error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
