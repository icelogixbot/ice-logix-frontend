import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENROUTER_VISION_MODEL = Deno.env.get("OPENROUTER_VISION_MODEL") || "google/gemini-2.0-flash-001";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripMarkdown(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function callVisionLLM(prompt: string, images: string[]): Promise<any> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const content: any[] = [
    { type: "text", text: prompt }
  ];

  for (const img of images) {
    let url = img;
    if (!url.startsWith("http") && !url.startsWith("data:")) {
      url = `data:image/jpeg;base64,${img}`;
    }
    content.push({
      type: "image_url",
      image_url: { url }
    });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://icelogix.com",
      "X-Title": "icelogix-legit-check",
    },
    body: JSON.stringify({
      model: OPENROUTER_VISION_MODEL,
      messages: [{ role: "user", content }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter error: ${res.status} ${await res.text()}`);
  }
  
  const data = await res.json();
  const rawText = data.choices[0]?.message?.content || "{}";
  return JSON.parse(stripMarkdown(rawText));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { photo_base64, brand_hint, model_hint } = await req.json();

    if (!photo_base64) {
      return new Response(JSON.stringify({ error: "photo_base64 is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Phase 1: Detection
    const detectionPrompt = `Analyze this product photo. Identify the brand and specific model name.
Return ONLY a JSON object with:
{
  "brand": "string",
  "model": "string",
  "category": "string",
  "confidence": "low|medium|high"
}
Hints from user: brand=${brand_hint || 'unknown'}, model=${model_hint || 'unknown'}.`;

    const detectionData = await callVisionLLM(detectionPrompt, [photo_base64]);
    
    let detectedBrand = detectionData.brand || brand_hint || "";
    let detectedModel = detectionData.model || model_hint || "";

    let dbAuthMarkers = null;
    let dbRedFlags = null;
    let refPhotos: any[] = [];
    
    if (detectedBrand) {
      const brandSlug = slugify(detectedBrand);
      
      const { data: brandData } = await supabase
        .from("legit_check_brands")
        .select("id, slug")
        .eq("slug", brandSlug)
        .maybeSingle();
        
      if (brandData && detectedModel) {
        const modelSlug = slugify(detectedModel);
        
        let { data: modelData } = await supabase
          .from("legit_check_models")
          .select("id, slug, aliases, auth_markers, red_flags, sku_pattern, notes")
          .eq("brand_id", brandData.id)
          .eq("slug", modelSlug)
          .maybeSingle();
          
        if (!modelData) {
           // Fallback: fetch all models for brand and fuzzy match
           const { data: allModels } = await supabase
             .from("legit_check_models")
             .select("id, slug, aliases, auth_markers, red_flags, sku_pattern, notes")
             .eq("brand_id", brandData.id);
             
           if (allModels && allModels.length > 0) {
             const searchStr = detectedModel.toLowerCase();
             modelData = allModels.find(m => {
               if (searchStr.includes(m.slug.replace(/-/g, ' '))) return true;
               if (m.sku_pattern && searchStr.includes(m.sku_pattern.toLowerCase())) return true;
               if (Array.isArray(m.aliases)) {
                 return m.aliases.some((alias: string) => searchStr.includes(alias.toLowerCase()));
               }
               return false;
             }) || null;
           }
        }
        
        if (modelData) {
          dbAuthMarkers = modelData.auth_markers;
          dbRedFlags = modelData.red_flags;
          detectedModel = modelData.slug; // Normalize
          
          const { data: photos } = await supabase
            .from("legit_check_reference_photos")
            .select("photo_url, angle")
            .eq("model_id", modelData.id)
            .order("ordering", { ascending: true })
            .limit(5);
            
          if (photos) {
             refPhotos = photos;
          }
        }
      }
    }

    // Phase 2: Evaluation
    const evalImages = [photo_base64];
    for (const ref of refPhotos) {
       if (ref.photo_url) evalImages.push(ref.photo_url);
    }

    const evalPrompt = `You are a professional luxury and sneaker authenticator. 
Compare the user's uploaded photo (the first image) against the reference photos (subsequent images, if any).
We have the following known authenticity markers for this model: ${JSON.stringify(dbAuthMarkers || [])}
And these known red flags for fakes: ${JSON.stringify(dbRedFlags || [])}

Evaluate the item's authenticity based on the visual evidence.
Return ONLY a JSON object with:
{
  "score": number (0-100, 100 is perfectly authentic, 0 is obvious fake),
  "verdict": "likely-authentic" | "suspicious" | "likely-fake",
  "confidence": "low" | "medium" | "high",
  "issues": ["string array of detected flaws or suspicious details"],
  "auth_markers_passed": ["string array of authenticity markers that look correct"]
}`;

    const evalData = await callVisionLLM(evalPrompt, evalImages);

    const result = {
      score: evalData.score || 50,
      verdict: evalData.verdict || "unknown",
      confidence: evalData.confidence || "low",
      detected_brand: detectedBrand,
      detected_model: detectedModel,
      issues: evalData.issues || [],
      auth_markers_passed: evalData.auth_markers_passed || [],
      disclaimer: "AI-оценка, не сертификация подлинности. Точность 70-80%."
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Legit check error:", error);
    return new Response(JSON.stringify({
      score: 50,
      verdict: "unknown",
      error: "AI temporarily unavailable"
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
