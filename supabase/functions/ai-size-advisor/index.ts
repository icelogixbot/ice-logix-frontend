// supabase/functions/ai-size-advisor/index.ts
// ICE LOGIX — ai-size-advisor v1.0
//
// Edge Function for calculating the optimal clothing/shoe size using a cheap LLM.
//
// Usage:
//   POST /functions/v1/ai-size-advisor
//   Authorization: Bearer <SUPABASE_ANON_KEY>
//   Content-Type: application/json
//   Body: { "category": "Кроссовки", "gender": "Мужской", "height": 180, "weight": 75, "measure": 27, "brand": "Nike" }
//

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
// Use the free or ultra-cheap model to minimize token costs to zero
const TEXT_MODEL = "google/gemini-2.5-flash-lite";

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
    if (!payload || typeof payload !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid request payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { category, gender, height, weight, measure, brand } = payload;

    if (!OPENROUTER_API_KEY) {
      console.warn("OPENROUTER_API_KEY is not set. Size advisor will return placeholder.");
      return new Response(
        JSON.stringify({ ok: false, error: "OpenRouter API Key not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a highly compact prompt to keep token counts extremely small
    const prompt = `You are a size helper for the delivery service ICE LOGIX.
We have: category="${category || "unknown"}", gender="${gender || "Unisex"}", height=${height || "N/A"}cm, weight=${weight || "N/A"}kg, insole=${measure || "N/A"}cm, brand="${brand || "unknown"}".
Recommend the best EU and US size.
Provide a 1-sentence advice in Russian. If the brand usually runs small/large, mention it.
Example output format:
"Рекомендуем EU 42 / US 9 (стелька 27см). Nike идет размер в размер."

Return ONLY a JSON object:
{
  "size": "string (the recommended size label, e.g. 'EU 42 / US 9' or 'L')",
  "advice": "string (the Russian advice sentence)"
}`;

    const body = {
      model: TEXT_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 150, // strict limit to prevent runaway token costs
    };

    // If free model fails, we will fallback to standard gemini-2.0-flash-001 in try-catch
    let res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://icelogix.app",
        "X-Title": "ICE LOGIX ai-size-advisor",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn(`Primary model failed (HTTP ${res.status}). Trying fallback model gemini-2.5-flash...`);
      // Fallback to standard gemini-2.5-flash
      body.model = "google/gemini-2.5-flash";
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://icelogix.app",
          "X-Title": "ICE LOGIX ai-size-advisor",
        },
        body: JSON.stringify(body),
      });
    }

    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${res.status}: ${errTxt.slice(0, 300)}`);
    }

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content || "";
    if (!rawContent) throw new Error("OpenRouter returned empty message content");

    const parsed = parseAssistantJson(rawContent);
    const size = String(parsed.size || "").trim();
    const advice = String(parsed.advice || "").trim();

    return new Response(
      JSON.stringify({
        ok: true,
        size: size,
        advice: advice,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-size-advisor:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
