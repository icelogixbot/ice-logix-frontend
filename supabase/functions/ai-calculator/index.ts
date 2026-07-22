import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const VISION_MODEL = Deno.env.get("OPENROUTER_VISION_MODEL") || "google/gemini-2.0-flash-001";
const TEXT_MODEL = "google/gemini-2.5-flash-lite";
const STORAGE_BUCKET = "product-screenshots";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Fallback currency rates
const FALLBACK_RATES: Record<string, number> = {
  USD_to_BYN: 3.27,
  EUR_to_BYN: 3.59,
  CNY_to_BYN: 0.45,
  PLN_to_BYN: 0.83,
  RUB_to_BYN: 0.034,
};

async function fetchOneRate(abbr: string): Promise<number | null> {
  try {
    const r = await fetch(`https://api.nbrb.by/exrates/rates/${abbr}?parammode=2`, { cache: "no-store" });
    if (!r.ok) return null;
    const data = await r.json();
    const v = data.Cur_OfficialRate / data.Cur_Scale;
    return Number.isFinite(v) ? v : null;
  } catch (_e) {
    return null;
  }
}

async function getExchangeRates(): Promise<Record<string, number>> {
  const currencies = ["USD", "EUR", "CNY", "RUB", "PLN"];
  const results = await Promise.allSettled(currencies.map(c => fetchOneRate(c)));
  const rates = { ...FALLBACK_RATES };
  currencies.forEach((code, i) => {
    const res = results[i];
    const v = res.status === "fulfilled" ? res.value : null;
    if (v && Number.isFinite(v) && v > 0) {
      rates[`${code}_to_BYN`] = v;
    }
  });
  return rates;
}

function parseAssistantJson(raw: string): Record<string, any> {
  let s = (raw || "").trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/s, "").trim();
  }
  try {
    return JSON.parse(s);
  } catch (e) {
    console.error("JSON parse error on assistant output:", s, e);
    return {};
  }
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

    const { action } = payload;

    if (action === "estimate_weight") {
      const { description, screenshotPath } = payload;

      let imageUrl = "";
      if (screenshotPath) {
        const { data: urlData, error: urlErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(screenshotPath, 600);
        if (!urlErr && urlData?.signedUrl) {
          imageUrl = urlData.signedUrl;
        }
      }

      if (!description && !imageUrl) {
        return new Response(
          JSON.stringify({ ok: false, error: "Provide description or photo" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build weight estimation prompt
      const prompt = `You are a weight estimator assistant for ICE LOGIX delivery.
Analyze the product description or image provided by the user and estimate the typical shipping weight of this item in kilograms.
Here are typical weights:
- T-shirt / Polo / Socks / Hat: 0.2 - 0.3 kg
- Jeans / Pants / Shorts / Hoodie / Sweatshirt: 0.7 - 0.8 kg
- Light jacket / Windbreaker: 0.8 - 1.0 kg
- Winter down jacket / Heavy coat / Boots: 1.5 - 2.5 kg
- Sneakers / Casual shoes: 1.2 kg (standard)
- Small bag / Wallet / Accessories: 0.3 - 0.5 kg
- Backpack / Large bag: 0.8 - 1.2 kg

Return ONLY a JSON object:
{
  "weight": number (estimated weight in kg, e.g. 1.2 or 0.7),
  "product_name": "string (short Russian name of the identified product, e.g. 'Кроссовки Nike' or 'Худи Calvin Klein')"
}`;

      const messages: any[] = [];
      if (imageUrl) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: prompt + (description ? `\nUser hint: "${description}"` : "") },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        });
      } else {
        messages.push({
          role: "user",
          content: prompt + `\nUser product query: "${description}"`,
        });
      }

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://icelogix.app",
          "X-Title": "ICE LOGIX ai-weight-estimator",
        },
        body: JSON.stringify({
          model: imageUrl ? VISION_MODEL : TEXT_MODEL,
          messages,
          temperature: 0.1,
          max_tokens: 150,
        }),
      });

      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        throw new Error(`OpenRouter HTTP ${res.status}: ${errTxt}`);
      }

      const data = await res.json();
      const rawOutput = data?.choices?.[0]?.message?.content || "";
      const parsed = parseAssistantJson(rawOutput);

      return new Response(
        JSON.stringify({ ok: true, weight: parsed.weight || 1.0, product_name: parsed.product_name || "" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "calculate") {
      const { title, price, currency, country, weight, local_delivery, additional_services } = payload;

      if (!title || price === undefined || !currency || !country) {
        return new Response(
          JSON.stringify({ ok: false, error: "Missing required fields" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const rates = await getExchangeRates();

      // Convert product price to BYN
      const rateKey = `${currency}_to_BYN`;
      const rate = rates[rateKey] || 1;
      const productCostBYN = price * rate;

      // 30% Service Commission
      const commissionBYN = productCostBYN * 0.30;

      // Estimate weight if not provided
      let finalWeight = parseFloat(weight) || 0;
      let aiEstimated = false;
      let notes = "";

      if (finalWeight <= 0) {
        aiEstimated = true;
        // Ask LLM to quickly estimate weight based on title
        const prompt = `You are a weight estimator assistant for ICE LOGIX.
Analyze the product title: "${title}". Estimate its shipping weight in kg.
Return ONLY a JSON object:
{
  "weight": number,
  "explanation": "string (1-sentence Russian note why this weight was chosen)"
}`;
        try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify({
              model: TEXT_MODEL,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.1,
              max_tokens: 150,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const parsed = parseAssistantJson(data?.choices?.[0]?.message?.content || "");
            finalWeight = parseFloat(parsed.weight) || 1.0;
            notes = parsed.explanation || "";
          } else {
            finalWeight = 1.0;
          }
        } catch (_) {
          finalWeight = 1.0;
        }
      }

      // Check additional packaging weight reduction
      const removeBox = !!additional_services?.remove_box;
      let calcWeight = finalWeight;
      if (removeBox) {
        calcWeight = Math.max(0.1, finalWeight - 0.3);
      }

      // Calculate international shipping
      // China = weight * 10 USD. Europe/Poland = weight * 8 USD. Russia = weight * 7 USD.
      let ratePerKgUSD = 10;
      if (country === "EU" || country === "PL") ratePerKgUSD = 8;
      if (country === "RU") ratePerKgUSD = 7;

      const usdToByn = rates["USD_to_BYN"] || 3.27;
      const internationalShippingBYN = calcWeight * ratePerKgUSD * usdToByn;

      // Additional services costs in BYN
      let additionalServicesBYN = 0;
      const servicesList = [];
      if (additional_services?.detailed_photo) {
        additionalServicesBYN += 5;
        servicesList.push("Детальный фотоотчет (5 BYN)");
      }
      if (additional_services?.video_360) {
        additionalServicesBYN += 10;
        servicesList.push("Видеообзор 360° (10 BYN)");
      }
      if (additional_services?.fragile_packaging) {
        additionalServicesBYN += 10; // default fee for fragile
        servicesList.push("Упаковка для хрупкого (10 BYN)");
      }

      // 2% Mandatory Insurance
      const insuranceBYN = productCostBYN * 0.02;

      // Belarus logistics
      let localDeliveryBYN = 0;
      if (local_delivery === "belpost") localDeliveryBYN = 7;
      if (local_delivery === "europost") localDeliveryBYN = 5;
      if (local_delivery === "pickup") localDeliveryBYN = 0;

      // Customs duty (RB Limit: 200 EUR, 15% exceeding + 10 BYN fee)
      const eurToByn = rates["EUR_to_BYN"] || 3.59;
      const costEUR = productCostBYN / eurToByn;
      let customsDutyBYN = 0;
      if (costEUR > 200) {
        customsDutyBYN += (costEUR - 200) * 0.15 * eurToByn + 10;
      }
      if (calcWeight > 31) {
        customsDutyBYN += (calcWeight - 31) * 5;
      }

      // Total BYN
      const totalBYN = productCostBYN + commissionBYN + internationalShippingBYN + additionalServicesBYN + insuranceBYN + localDeliveryBYN + customsDutyBYN;

      return new Response(
        JSON.stringify({
          ok: true,
          rates,
          calc_details: {
            product_cost_byn: Number(productCostBYN.toFixed(2)),
            commission_byn: Number(commissionBYN.toFixed(2)),
            weight_kg: Number(finalWeight.toFixed(2)),
            calc_weight_kg: Number(calcWeight.toFixed(2)),
            ai_estimated: aiEstimated,
            international_shipping_byn: Number(internationalShippingBYN.toFixed(2)),
            insurance_byn: Number(insuranceBYN.toFixed(2)),
            local_delivery_byn: Number(localDeliveryBYN.toFixed(2)),
            additional_services_byn: Number(additionalServicesBYN.toFixed(2)),
            customs_duty_byn: Number(customsDutyBYN.toFixed(2)),
            total_byn: Number(totalBYN.toFixed(2)),
            currency_rateUsed: Number(rate.toFixed(4)),
            notes,
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
