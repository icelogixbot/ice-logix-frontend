// supabase/functions/parse-screenshot/index.ts
// ICE LOGIX — parse-screenshot v2.0 (наша ICE LOGIX AI, без сторонних сервисов)
//
// Извлекает название, цену, валюту и бренд со скриншота товара.
// Распознавание делает наш сервер ICE LOGIX AI (ice-logix-doc-ai, метод /scan-product):
// RapidOCR (китайский + латиница) и правила. Внешние ИИ не используются.
//
// POST /functions/v1/parse-screenshot
// Body: { "jobId": "<id parse_queue>", "screenshotPath": "<путь в bucket product-screenshots>" }
//
// Итоговый статус в parse_queue:
//   название + цена → done; чего-то не хватает → manual_required с подсказкой, что ввести.
//
// Секреты: SUPABASE_URL / секретный ключ (стандартные), DOC_AI_URL (по умолчанию наш VPS),
// DOC_AI_KEY (ключ доступа к ICE LOGIX AI, Nginx без него отвечает 401).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = sbSecretKey()!;
const supabase = createClient(supabaseUrl, supabaseKey);
 
const DOC_AI_URL = (Deno.env.get("DOC_AI_URL") || "http://80.94.235.37").replace(/\/$/, "");
const DOC_AI_KEY = Deno.env.get("DOC_AI_KEY") || "";
const STORAGE_BUCKET = "product-screenshots";
 
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
 
// ─── Currency normalizer ─────────────────────────────────────────────────────
function normalizeCurrency(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const u = raw.trim().toUpperCase();
  if (u === "$" || u === "USD") return "USD";
  if (u === "€" || u === "EUR") return "EUR";
  if (u === "¥" || u === "CNY" || u === "RMB" || u === "元") return "CNY";
  if (u === "£" || u === "GBP") return "GBP";
  if (u === "₽" || u === "RUB" || u === "RUR") return "RUB";
  if (u === "BYN" || u === "BYR") return "BYN";
  if (/^[A-Z]{3}$/.test(u)) return u;
  return null;
}
 
// ─── Vision API call ─────────────────────────────────────────────────────────
 
interface VisionResult {
  title: string | null;
  price: number | null;
  currency: string | null;
  brand: string | null;
  category: string | null;
  description: string | null;
  color: string | null;
  confidence: "high" | "medium" | "low" | null;
}
 
function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// Категория по названию (как в приложении: Обувь / Одежда / Аксессуары)
function guessCategory(title: string | null): string | null {
  const t = (title || "").toLowerCase();
  if (/鞋|靴|кроссов|кеды|ботин|обув|sneaker|shoe|boot/.test(t)) return "Обувь";
  if (/包|表|帽|眼镜|皮带|钱包|сумк|рюкзак|часы|кепк|очки|ремень|bag|watch|cap|wallet|belt/.test(t)) return "Аксессуары";
  if (/衣|裤|裙|t恤|夹克|外套|худи|футбол|куртк|брюк|джинс|платье|hoodie|shirt|jacket|pants|jeans/.test(t)) return "Одежда";
  return null;
}

async function callDocAI(screenshotPath: string, log: (m: string) => void): Promise<VisionResult> {
  const { data: file, error } = await supabase.storage.from(STORAGE_BUCKET).download(screenshotPath);
  if (error || !file) throw new Error(`Storage download failed: ${error?.message || "unknown"}`);
  const image = toBase64(new Uint8Array(await file.arrayBuffer()));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  try {
    log(`ICE LOGIX AI: ${DOC_AI_URL}/scan-product (${Math.round(image.length / 1024)} KB)`);
    const res = await fetch(`${DOC_AI_URL}/scan-product`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Ice-Ai-Key": DOC_AI_KEY },
      body: JSON.stringify({ image }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ICE LOGIX AI HTTP ${res.status}`);
    const r = await res.json();
    if (r?.error) throw new Error(`ICE LOGIX AI: ${r.error}`);
    const title = typeof r.title_ru === "string" && r.title_ru ? r.title_ru : (r.title || null);
    const price = typeof r.price === "number" && r.price > 0 ? r.price : null;
    return {
      title,
      price,
      currency: normalizeCurrency(r.currency),
      brand: r.brand || null,
      category: guessCategory(r.title || title),
      description: null,
      color: null,
      confidence: title && price ? "high" : (title || price ? "medium" : "low"),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Main handler ────────────────────────────────────────────────────────────
 
interface RequestBody {
  jobId: string;
  screenshotPath: string;
}
 
Deno.serve(async (req) => {
  const log = (msg: string) => console.log(`[parse-screenshot] ${msg}`);
 
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
 
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
 
  let jobId: string | null = null;
 
  try {
    const body = (await req.json()) as Partial<RequestBody>;
    if (!body.jobId || !body.screenshotPath) {
      return new Response(
        JSON.stringify({ error: "Missing jobId or screenshotPath" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    jobId = body.jobId;
    const screenshotPath = body.screenshotPath;
    log(`Job ${jobId}: screenshot=${screenshotPath}`);
 
    // 1. Помечаем job как pending — фронт увидит, что обработка началась
    await supabase
      .from("parse_queue")
      .update({
        status: "pending",
        screenshot_path: screenshotPath,
        error_message: null,
        parse_method: "screenshot_pending",
      })
      .eq("id", jobId);
 
    // 2. Распознавание нашей ICE LOGIX AI
    const result = await callDocAI(screenshotPath, log);
    log(
      `ICE LOGIX AI result: title="${result.title}", price=${result.price} ${result.currency}, confidence=${result.confidence}`,
    );
 
    // 4. Решаем итоговый статус по умному dispatch'у
    const hasTitle = !!result.title;
    const hasPrice = !!(result.price && result.price > 0);
 
    let finalStatus: string;
    let errorMessage: string | null;
 
    if (hasTitle && hasPrice) {
      finalStatus = "done";
      errorMessage = null;
    } else if (hasPrice && !hasTitle) {
      finalStatus = "manual_required";
      errorMessage =
        "Я нашёл цену и описание товара, но не вижу название. Загрузите ещё один скриншот с заголовком (верхняя часть страницы товара) или введите название вручную.";
    } else if (hasTitle && !hasPrice) {
      finalStatus = "manual_required";
      errorMessage =
        "Я распознал название товара, но не вижу цену. Загрузите скриншот с ценой или введите её вручную.";
    } else {
      finalStatus = "manual_required";
      errorMessage =
        "Не удалось распознать товар на скриншоте. Загрузите более чёткий скриншот товарной страницы или введите название и цену вручную.";
    }
 
    log(
      `Decision: hasTitle=${hasTitle} hasPrice=${hasPrice} → status=${finalStatus}`,
    );
 
    // 5. Обновляем parse_queue
    const { error: updateErr } = await supabase
      .from("parse_queue")
      .update({
        status: finalStatus,
        title: result.title,
        price: result.price,
        currency: result.currency,
        brand: result.brand,
        category: result.category,
        description: result.description,
        color: result.color,
        parse_method: "screenshot_ice_ai",
        error_message: errorMessage,
      })
      .eq("id", jobId);
 
    if (updateErr) throw new Error(`DB update: ${updateErr.message}`);
    log(`Completed: status=${finalStatus}`);
 
    return new Response(
      JSON.stringify({
        ok: true,
        status: finalStatus,
        title: result.title,
        price: result.price,
        currency: result.currency,
        confidence: result.confidence,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`Error: ${msg}`);
    if (jobId) {
      await supabase
        .from("parse_queue")
        .update({
          status: "manual_required",
          error_message: `Ошибка распознавания скриншота: ${msg.slice(0, 200)}. Введите данные вручную.`,
          parse_method: "screenshot_error",
        })
        .eq("id", jobId);
    }
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

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
