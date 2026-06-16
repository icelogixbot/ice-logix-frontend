// supabase/functions/ai-review-correction/index.ts
// ICE LOGIX — ai-review-correction v1.0
//
// Edge Function for validating and correcting user reviews to bypass spam/moderation filters
// on mapping platforms (Yandex.Maps, Google Maps, 2GIS) before submitting.
//
// Usage:
//   POST /functions/v1/ai-review-correction
//   Authorization: Bearer <SUPABASE_ANON_KEY>
//   Content-Type: application/json
//   Body: { "text": "Текст отзыва..." }
//

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const TEXT_MODEL = Deno.env.get("OPENROUTER_TEXT_MODEL") || "google/gemini-2.0-flash-001";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function parseAssistantJson(raw: string): Record<string, unknown> {
  let s = (raw || "").trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/s, "").trim();
  }
  return JSON.parse(s) as Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object" || !payload.text) {
      return new Response(
        JSON.stringify({ error: "Missing text in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const text = String(payload.text).trim();

    if (!OPENROUTER_API_KEY) {
      console.warn("OPENROUTER_API_KEY is not set. Returning review text unmodified.");
      return new Response(
        JSON.stringify({ corrected: false, text: text }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are a text moderation assistant for a logistics/buyer service in Belarus and Russia (ICE LOGIX).
The user is writing a review for our service. Some platforms (like Yandex Maps, Google Maps, 2GIS) block reviews containing words related to B2B, drop-shipping, referrals, or earning money on reviews.

Your job is to analyze the review text and clean up these filter-trigger words by converting them into customer-friendly, natural retail equivalents:
- "дропшиппинг" / "dropshipping" / "дроп" -> "программа сотрудничества" or "работа с партнерами"
- "рефералка" / "referral" -> "партнерская программа" or "рекомендация друзьям"
- "заработал на рекламе" / "выплаты по рекламе" -> "сотрудничество по рекламе" or "рекламная интеграция"
- "выплаты по партнерке" / "выплаты" -> "получение бонусов" or "партнерские начисления"

CRITICAL RULES:
1. LONG READS: If the text is long (more than 200 characters) and tells a personal story, even with minor complaints that were resolved, do NOT change it unless it contains direct stop words (referral, dropshipping, etc.). Stories are highly valued.
2. PRESERVE DETAILS: You MUST keep specific details like city names (e.g. Minsk), brand names (Nike, Adidas, etc.), and exact delivery times (e.g. "12 days").
3. STYLE: Keep the language simple, casual, and natural. Do NOT make it sound poetic, overly formal, or marketing-heavy. It must look like it was written by a real, average customer.
4. If the text does not contain any stop words and does not need correction, return the original text unchanged, and set "corrected" to false. Otherwise, correct it and set "corrected" to true.

Output ONLY a valid JSON object with the following fields:
- "corrected": boolean (true if you modified the text, false otherwise)
- "text": string (the final cleaned review text)

Review to process:
"${text}"

Return JSON only:`;

    const body = {
      model: TEXT_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
      max_tokens: 1000,
    };

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://icelogix.app",
        "X-Title": "ICE LOGIX ai-review-correction",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${res.status}: ${errTxt.slice(0, 300)}`);
    }

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content || "";
    if (!rawContent) throw new Error("OpenRouter returned empty message content");

    const parsed = parseAssistantJson(rawContent);
    const corrected = !!parsed.corrected;
    const correctedText = String(parsed.text || text).trim();

    return new Response(
      JSON.stringify({
        ok: true,
        corrected: corrected && (correctedText !== text),
        text: correctedText,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-review-correction:", error);
    const msg = error instanceof Error ? error.message : String(error);
    // Return original text if AI fails to keep the app working
    return new Response(
      JSON.stringify({ ok: false, error: msg, corrected: false, text: "" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
