// supabase/functions/search-by-image/index.ts
// ICE LOGIX — search-by-image v2.0 (Apify Google Lens)
//
// Поиск товара по фото. Двухступенчатый pipeline:
//   1. PRIMARY  — Apify actor `borderline/google-lens` (Google Lens reverse image search).
//                  Возвращает реальные shopping-результаты с маркетплейсов.
//   2. FALLBACK — OpenRouter Vision (Gemini) → описание → search-products (Firecrawl).
//                  Используется если APIFY_API_TOKEN не задан, Apify упал, или вернул 0 результатов.
//
// Поток:
//   1. Принимает screenshotPath (путь в bucket product-screenshots)
//   2. Создаёт signed URL для файла (600 сек)
//   3. PRIMARY: вызывает Apify actor с imageUrls + searchTypes=["products"]
//   4. Фильтрует результаты по нашим маркетплейсам (poizon, taobao, zalando, asos, farfetch и т.д.)
//   5. Если результатов < 2 — fallback на Vision+search-products
//   6. Возвращает unified response с полем `source: "apify" | "vision-fallback"`
//
// Использование:
//   POST /functions/v1/search-by-image
//   Body: { "screenshotPath": "user_id/123_photo.jpg", "platforms": ["poizon","zalando"] }
//
// Версия: 2026.05.04.02

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN") || "";
const VISION_MODEL = Deno.env.get("OPENROUTER_VISION_MODEL") || "google/gemini-2.5-flash";
const STORAGE_BUCKET = "product-screenshots";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Маркетплейсы которые мы умеем обрабатывать ─────────────────────────────
type PlatformInfo = {
  key: string;        // internal id
  label: string;      // display name
  flag: string;       // emoji
  hosts: string[];    // hostnames (without www.)
  country: string;    // ISO-2 (или "EU" для общеевропейских)
};

const PLATFORMS: PlatformInfo[] = [
  // 🇨🇳 7 Основных розничных китайских площадок
  { key: "poizon",      label: "Poizon / Dewu", flag: "🇨🇳", hosts: ["poizon.com", "dewu.com", "dewuapp.com", "duapp.com", "poizon.app"], country: "CN" },
  { key: "95fen",       label: "95分",          flag: "🇨🇳", hosts: ["95fen.com", "shizhuang-app.com"], country: "CN" },
  { key: "taobao",      label: "Taobao",        flag: "🇨🇳", hosts: ["taobao.com", "world.taobao.com", "intl.taobao.com", "m.tb.cn"], country: "CN" },
  { key: "tmall",       label: "Tmall",         flag: "🇨🇳", hosts: ["tmall.com", "tmall.hk", "detail.tmall.com", "m.tmall.com"], country: "CN" },
  { key: "pinduoduo",   label: "Pinduoduo",     flag: "🇨🇳", hosts: ["pinduoduo.com", "yangkeduo.com", "pdd.com", "mobile.yangkeduo.com"], country: "CN" },
  { key: "xianyu",      label: "Xianyu (闲鱼)", flag: "🇨🇳", hosts: ["goofish.com", "2.taobao.com", "idle.taobao.com", "xianyu.com", "m.tb.cn"], country: "CN" },
  { key: "jd",          label: "JD.com",        flag: "🇨🇳", hosts: ["jd.com", "item.jd.com", "global.jd.com", "m.jd.com", "jd.hk"], country: "CN" },
];

// Дефолт = 7 розничных платформ
const DEFAULT_PLATFORMS = [
  "poizon", "95fen", "taobao", "tmall", "pinduoduo", "xianyu", "jd"
];

function platformForUrl(rawUrl: string): PlatformInfo | null {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
    for (const p of PLATFORMS) {
      for (const h of p.hosts) {
        if (host === h || host.endsWith("." + h)) return p;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Apify Google Lens — primary ────────────────────────────────────────────
//
// Структура ответа от actor `borderline/google-lens` для searchTypes=["visual-match","exact-match"]:
//   [
//     {
//       "visual-match": { "results": [ { "search": { "title", "href", "description" } }, ... ] },
//       "exact-match":  { "results": [ { "search": { "title", "href", "description" } }, ... ] },
//       "global":       { "results": [ { "error": "...", "message": "...", ... } ] }   // когда поиск ничего не нашёл
//     }
//   ]
type ApifyHit = {
  search?: {
    title?: string;
    href?: string;
    description?: string;
  };
  // Older / alternate shape — defensive
  title?: string;
  href?: string;
  link?: string;
  url?: string;
  description?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  source?: string;
  price?: string;
};

type ApifyBucket = { results?: ApifyHit[] };

type ApifyDatasetItem = {
  "visual-match"?: ApifyBucket;
  "exact-match"?: ApifyBucket;
  "products"?: ApifyBucket;
  "all"?: ApifyBucket;
  "global"?: ApifyBucket;
  // Defensive — older shapes
  visualMatches?: ApifyHit[];
  exactMatches?: ApifyHit[];
  results?: ApifyHit[];
};

function extractApifyHits(items: ApifyDatasetItem[]): ApifyHit[] {
  const out: ApifyHit[] = [];
  for (const it of items) {
    const buckets: Array<ApifyHit[] | undefined> = [
      it["visual-match"]?.results,
      it["exact-match"]?.results,
      it["products"]?.results,
      it["all"]?.results,
      it.visualMatches,
      it.exactMatches,
      it.results,
    ];
    for (const b of buckets) {
      if (Array.isArray(b)) out.push(...b);
    }
  }
  return out;
}

function hitUrl(h: ApifyHit): string {
  return String(h.search?.href || h.href || h.link || h.url || "").trim();
}

// Известные source-имена которые borderline-actor префиксует к title
const KNOWN_SOURCE_PREFIXES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /^GOAT(?=[A-ZА-Я0-9])/i,           name: "GOAT" },
  { pattern: /^eBay(?=[A-ZА-Я0-9])/i,           name: "eBay" },
  { pattern: /^StockX(?=[A-ZА-Я0-9])/i,         name: "StockX" },
  { pattern: /^Zalando(?=[A-ZА-Я0-9])/i,        name: "Zalando" },
  { pattern: /^ASOS(?=[A-ZА-Я0-9])/i,           name: "ASOS" },
  { pattern: /^Farfetch(?=[A-ZА-Я0-9])/i,       name: "Farfetch" },
  { pattern: /^SSENSE(?=[A-ZА-Я0-9])/i,         name: "SSENSE" },
  { pattern: /^MR PORTER(?=[A-ZА-Я0-9])/i,      name: "MR PORTER" },
  { pattern: /^MYTHERESA(?=[A-ZА-Я0-9])/i,      name: "MYTHERESA" },
  { pattern: /^Mytheresa(?=[A-ZА-Я0-9])/i,      name: "Mytheresa" },
  { pattern: /^Net-A-Porter(?=[A-ZА-Я0-9])/i,   name: "Net-A-Porter" },
  { pattern: /^END\.(?=[A-ZА-Я0-9])/i,          name: "END." },
  { pattern: /^Poizon(?=[A-ZА-Я0-9])/i,         name: "Poizon" },
  { pattern: /^Dewu(?=[A-ZА-Я0-9])/i,           name: "Dewu" },
  { pattern: /^Taobao(?=[A-ZА-Я0-9])/i,         name: "Taobao" },
  { pattern: /^Tmall(?=[A-ZА-Я0-9])/i,          name: "Tmall" },
  { pattern: /^Wildberries(?=[A-ZА-Я0-9])/i,    name: "Wildberries" },
  { pattern: /^Lamoda(?=[A-ZА-Я0-9])/i,         name: "Lamoda" },
  { pattern: /^Ozon(?=[A-ZА-Я0-9])/i,           name: "Ozon" },
  { pattern: /^Aboutyou(?=[A-ZА-Я0-9])/i,       name: "Aboutyou" },
  { pattern: /^About You(?=[A-ZА-Я0-9])/i,      name: "About You" },
];

function hitTitle(h: ApifyHit): string {
  let t = String(h.search?.title || h.title || "").trim();
  if (!t) return "";

  // borderline-actor использует формат: "{SourceName}{ProductTitle} [| {Source[+extra]}]"
  // Примеры:
  //   "GOATBuy Nike Free RN Flyknit 2017 - 880843 600 | GOAT"
  //   "GOATBuy Nike Free Flyknit HTM SP - 616171 740 | GOATIn stock"
  //   "eBayPre-Owned Nike Free RN Flyknit Red ... | eBayUsed"

  // 1. Срезаем суффикс " | {Source[+extra]}" — всё что после "|"
  t = t.replace(/\s*\|\s*[A-Za-zА-Яа-я0-9 .,()'·-]{2,80}\s*$/, "").trim();

  // 2. Срезаем известный source-префикс (склеенный с title)
  for (const { pattern } of KNOWN_SOURCE_PREFIXES) {
    if (pattern.test(t)) {
      t = t.replace(pattern, "").trim();
      break;
    }
  }

  // 3. Срезаем известные торговые префиксы
  t = t.replace(/^(?:Buy|Pre-Owned|Used|New|Sponsored|Authentic|Authenticated|Shop)\s+/i, "").trim();

  return t;
}

function hitImage(h: ApifyHit): string | null {
  const raw = h.thumbnail || h.thumbnailUrl || h.imageUrl || null;
  if (!raw) return null;
  if (raw.startsWith("data:")) return raw;
  // Проксирование через weserv.nl предотвращает 403 ошибки анти-хотлинкинга китайских CDN (alicdn, dewu, pdd)
  const cleanUrl = raw.startsWith("//") ? `https:${raw}` : raw;
  return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;
}

function priceFromText(text: string | undefined): { price: number | null; currency: string | null } {
  if (!text) return { price: null, currency: null };
  const cleaned = text.replace(/\s+/g, " ").trim();
  const currencyMatch = cleaned.match(/(USD|EUR|GBP|CNY|RUB|BYN|PLN|JPY|KRW|\$|€|£|¥|₽|zł|Br)/i);
  const currencyMap: Record<string, string> = {
    "$": "USD", "€": "EUR", "£": "GBP", "¥": "CNY", "₽": "RUB", "zł": "PLN", "br": "BYN",
  };
  let currency = currencyMatch ? (currencyMap[currencyMatch[0].toLowerCase()] || currencyMatch[0].toUpperCase()) : "CNY";

  const numMatch = cleaned.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)/);
  let price: number | null = null;
  if (numMatch) {
    const raw = numMatch[1];
    const lastComma = raw.lastIndexOf(",");
    const lastDot = raw.lastIndexOf(".");
    let normalized = raw;
    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
    const n = parseFloat(normalized);
    if (isFinite(n) && n > 0) price = n;
  }
  return { price, currency };
}

type ApifyResultItem = {
  platform: string;
  platform_label: string;
  flag: string;
  title: string;
  url: string;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  score: number;
};

// Returns all raw hits + exact-match URL set. Caller decides how to filter.
async function searchByImageViaApifyFull(
  imageUrls: string[],
): Promise<{
  ok: boolean;
  allHits: ApifyHit[];
  exactUrls: Set<string>;
  raw_count: number;
  error?: string;
}> {
  if (!APIFY_API_TOKEN) {
    return { ok: false, allHits: [], exactUrls: new Set(), raw_count: 0, error: "APIFY_API_TOKEN not configured" };
  }

  const actorId = "borderline~google-lens";
  // Set actor timeout=35 so Edge Function finishes within ~40s (avoiding client-side timeouts).
  const runUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(APIFY_API_TOKEN)}&timeout=35&memory=1024`;

  // Use only "visual-match" — most reliable for shopping (returns real product pages).
  const input = {
    imageUrls: imageUrls.map(url => ({ url })),
    searchTypes: ["visual-match"],
    language: "en",
  };

  let items: ApifyDatasetItem[] = [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);
    const res = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, allHits: [], exactUrls: new Set(), raw_count: 0, error: `Apify HTTP ${res.status}: ${txt.substring(0, 200)}` };
    }
    items = await res.json();
    if (!Array.isArray(items)) items = [];
  } catch (e) {
    return { ok: false, allHits: [], exactUrls: new Set(), raw_count: 0, error: `Apify call failed: ${(e as Error).message}` };
  }

  const allHits = extractApifyHits(items);

  const exactUrls = new Set<string>();
  for (const it of items) {
    for (const r of (it["exact-match"]?.results || [])) {
      const u = hitUrl(r);
      if (u) exactUrls.add(u);
    }
  }

  return { ok: true, allHits, exactUrls, raw_count: allHits.length };
}

// ─── Vision: получаем поисковый запрос по нескольким снимкам ─────────────────
async function describeProductForSearch(imageUrls: string[]): Promise<{ query: string; pdd_query: string; brand: string | null; product_type: string | null; category: string | null; color: string | null }> {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

  const prompt = `Ты эксперт по распознаванию товаров по фото для китайских маркетплейсов (Pinduoduo, Taobao, 1688).
Твоя задача — изучить фото и составить по нему ДВА вида запросов:
1. "query": английское название товара (например "Polo Ralph Lauren zip hoodie grey")
2. "pdd_query": КИТАЙСКИЙ ПОИСКОВЫЙ ЗАПРОС С УЧЁТОМ СЛЕНГА ПРОДАВЦОВ PINDUODUO (简体中文).

ВАЖНЫЕ ПРАВИЛА ДЛЯ pdd_query:
- Продавцы на Pinduoduo НЕ пишут официальные латинские бренды!
- Для Polo Ralph Lauren обязательно используй PDD-сленг: 保罗 小马标 (например: "保罗 小马标 连帽卫衣 灰色")
- Для Nike: 空军 / 钩子
- Для Adidas: 三叶草 / 贝壳头
- Для Stone Island: 石头岛 / 罗盘
- Для Arc'teryx: 始祖鸟 / 骨头
- Для The North Face: 北面 1996
- Для Fear of God / Essentials: FOG 复线
- Укажи предмет одежды/обуви на китайском (连帽卫衣 = худи, 运动鞋 = кроссовки, 夹克 = куртка, T恤 = футболка).
- Укажи цвет на китайском (灰色, 黑色, 白色, 蓝色 и т.д.).

Верни ТОЛЬКО валидный JSON:
{"query":"Polo Ralph Lauren zip hoodie grey logo","pdd_query":"保罗 小马标 连帽卫衣 灰色","brand":"Polo Ralph Lauren","product_type":"Худи","category":"Одежда","color":"серый"}`;

  const imageParts = (imageUrls.length > 0 ? imageUrls : [""]).slice(0, 5).map((url) => ({
    type: "image_url",
    image_url: { url },
  }));

  const body = {
    model: VISION_MODEL,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        ...imageParts,
      ],
    }],
    temperature: 0,
    max_tokens: 250,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://icelogix.by",
        "X-Title": "ICE LOGIX search-by-image",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "<no body>");
      throw new Error(`OpenRouter ${res.status}: ${errText.substring(0, 200)}`);
    }

    const data = await res.json();
    const raw = String(data?.choices?.[0]?.message?.content ?? "").trim();
    const cleaned = raw.startsWith("```")
      ? raw.replace(/^```(?:json)?s*/i, "").replace(/s*```s*$/s, "").trim()
      : raw;

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return {
        query: cleaned.split("\n")[0].slice(0, 100),
        pdd_query: "",
        brand: null,
        product_type: null,
        category: null,
        color: null,
      };
    }

    return {
      query: typeof parsed.query === "string" ? parsed.query.trim() : "",
      pdd_query: typeof parsed.pdd_query === "string" ? parsed.pdd_query.trim() : "",
      brand: typeof parsed.brand === "string" ? parsed.brand.trim() : null,
      product_type: typeof parsed.product_type === "string" ? parsed.product_type.trim() : null,
      category: typeof parsed.category === "string" ? parsed.category.trim() : null,
      color: typeof parsed.color === "string" ? parsed.color.trim() : null,
    };
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

// ─── AI Visual Verification: Сравнивает фото клиента с фото товаров ──────────
async function verifyCandidatesVisuallyWithAI(
  clientPhotoUrl: string,
  candidates: ApifyResultItem[],
): Promise<ApifyResultItem[]> {
  if (!OPENROUTER_API_KEY || !clientPhotoUrl || candidates.length === 0) return candidates;

  const validCandidates = candidates.filter(c => c.image_url && /^https?:\/\//i.test(c.image_url));
  
  if (validCandidates.length === 0) {
    console.log("[AI Visual Matcher] ❌ No images. STRICT MODE: Rejecting all.");
    return []; // Строго удаляем, если нет фото
  }

  // Ограничиваем проверку до топ-4 кандидатов
  const toCheck = validCandidates.slice(0, 4);

  const prompt = `Ты строгий аутентификатор (Legit Check) и эксперт по отбору товаров по снимку. Твоя задача — отсеивать любой мусор, неточности и дешевые подделки, которые не совпадают с искомым товаром на фото пользователя.
На ИЗОБРАЖЕНИИ 0 — ИСКОМЫЙ ТОВАР ПОЛЬЗОВАТЕЛЯ.
Ниже фото кандидатов с маркетплейса:
${toCheck.map((c, i) => `Кандидат #${i+1}: "${c.title}" (Цена: ${c.price || '?'} ${c.currency || 'CNY'})`).join("\n")}

Сравни визуально ИЗОБРАЖЕНИЕ 0 с каждым Кандидатом как педантичный ревизор:
1. is_same_category (boolean): Совпадает ли тип изделия? Если на фото худи на молнии (zip), а кандидат — свитшот без молнии, футболка, юбка или куртка — СРАЗУ СТАВЬ is_same_category: false! Любое несовпадение кроя = false.
2. visual_similarity (0-100): Процент сходства. Обрати внимание на наличие логотипов (например, всадник Ральф Лорен), форму карманов, шнурков, капюшона. Если это откровенно дешевая паль с искаженным логотипом или другими пропорциями — ставь ниже 50%.
3. quality_rating (1-5): Оценка качества. Дешевая копия = 1, качественный товар = 4 или 5.

Верни ТОЛЬКО валидный JSON:
{"matches": [{"candidate_index": 1, "is_same_category": true, "visual_similarity": 95, "quality_rating": 5}]}
`;

  const imageParts = [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: clientPhotoUrl } },
    ...toCheck.map(c => ({
      type: "image_url",
      image_url: { url: c.image_url! }
    }))
  ];

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 40000);
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro", // Используем PRO версию для строгого Legit Check
        messages: [{ role: "user", content: imageParts }],
        temperature: 0,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error("[AI Visual Matcher] OpenRouter API error", res.status);
      return []; // СТРОГИЙ РЕЖИМ: при ошибке АПИ возвращаем ПУСТОТУ, чтобы не пропустить мусор
    }
    const data = await res.json();
    const raw = String(data?.choices?.[0]?.message?.content ?? "").trim();
    const parsed = parseAssistantJson(raw) as { matches?: Array<{ candidate_index: number; is_same_category?: boolean; visual_similarity?: number; quality_rating?: number }> };

    if (Array.isArray(parsed.matches)) {
      const verified = candidates.filter(c => {
        const idx = toCheck.indexOf(c);
        if (idx === -1) return false; // СТРОГИЙ РЕЖИМ: если не проверен ИИ - отбрасываем

        const m = parsed.matches?.find(it => it.candidate_index === idx + 1);
        if (!m) return false;
        
        if (m.is_same_category === false) {
          console.log(`[AI Visual Matcher] ❌ Category mismatch for candidate: "${c.title}"`);
          return false;
        }
        
        // Порог повышен до 85% для жесткого отсеивания "плохой пали"
        if (typeof m.visual_similarity === "number" && m.visual_similarity < 85) {
          console.log(`[AI Visual Matcher] ❌ Low similarity (${m.visual_similarity}%) for: "${c.title}"`);
          return false;
        }

        if (typeof m.visual_similarity === "number") c.score = (c.score || 1) + (m.visual_similarity / 10);
        if (typeof m.quality_rating === "number" && m.quality_rating >= 4) c.score = (c.score || 1) + 4;
        return true;
      });

      return verified;
    }
  } catch (e) {
    console.warn("[AI Visual Matcher] Error or Timeout:", (e as Error).message);
    return []; // СТРОГИЙ РЕЖИМ: при ошибке возвращаем ПУСТОТУ
  }

  return []; // СТРОГИЙ РЕЖИМ: фоллбэк - ПУСТОТА
}

// ─── Фильтрация и отображение только Топ-4 самых точных совпадений ───────────
function filterAndRankTopResults(
  items: ApifyResultItem[],
  visualDetails?: { brand: string | null; product_type: string | null; color: string | null },
  userHint = "",
  maxResults = 4,
  maxPrice: number | null = null,
): ApifyResultItem[] {
  if (!items || items.length === 0) return [];

  // Фильтр по максимальной цене
  const candidateItems = (maxPrice && maxPrice > 0)
    ? items.filter((it) => !it.price || it.price <= maxPrice)
    : items;

  if (candidateItems.length === 0) return [];

  const descLower = (userHint || "").toLowerCase();
  const brandLower = (visualDetails?.brand || "").toLowerCase();
  const typeLower = (visualDetails?.product_type || "").toLowerCase();

  const isHoodie = descLower.includes("худи") || descLower.includes("hoodie") || typeLower.includes("худи") || typeLower.includes("hoodie");
  const isSneaker = descLower.includes("кроссовки") || descLower.includes("кеды") || descLower.includes("sneaker") || typeLower.includes("кроссовки") || typeLower.includes("обувь");
  const isJacket = descLower.includes("куртка") || descLower.includes("пуховик") || descLower.includes("jacket") || typeLower.includes("куртка");

  const scored = candidateItems.map((item) => {
    const titleLower = (item.title || "").toLowerCase();
    let score = item.score || 1;

    // Бонус за точный бренд
    if (brandLower && titleLower.includes(brandLower)) {
      score += 3;
    }

    // Проверка соответствия категории (включая китайские термины!)
    if (isHoodie) {
      if (titleLower.includes("hoodie") || titleLower.includes("худи") || titleLower.includes("zip") || titleLower.includes("连帽") || titleLower.includes("卫衣") || titleLower.includes("开衫")) {
        score += 5;
      }
      // СТРОГИЙ ШТРАФ ЗА ФУТБОЛКИ/ПОЛО/МАЙКИ (T恤, 打底衫, 短袖, polo衫, 衬衫) ПРИ ПОИСКЕ ХУДИ
      if (
        titleLower.includes("t-shirt") || titleLower.includes("tee") || titleLower.includes("футболка") ||
        titleLower.includes("t恤") || titleLower.includes("打底衫") || titleLower.includes("短袖") ||
        titleLower.includes("polo衫") || titleLower.includes("衬衫") || titleLower.includes("圆领t") ||
        titleLower.includes("pants") || titleLower.includes("shorts")
      ) {
        score -= 25; // Гарантированный отсев футболок при поиске худи
      }
    } else if (isSneaker) {
      if (titleLower.includes("sneaker") || titleLower.includes("shoe") || titleLower.includes("кроссовки") || titleLower.includes("dunk") || titleLower.includes("force") || titleLower.includes("samba") || titleLower.includes("运动鞋") || titleLower.includes("板鞋") || titleLower.includes("跑鞋")) {
        score += 5;
      }
      if (titleLower.includes("shirt") || titleLower.includes("hoodie") || titleLower.includes("jacket") || titleLower.includes("pants") || titleLower.includes("卫衣") || titleLower.includes("t恤")) {
        score -= 25;
      }
    } else if (isJacket) {
      if (titleLower.includes("jacket") || titleLower.includes("coat") || titleLower.includes("куртка") || titleLower.includes("пуховик") || titleLower.includes("外套") || titleLower.includes("夹克") || titleLower.includes("羽绒服")) {
        score += 5;
      }
      if (titleLower.includes("t-shirt") || titleLower.includes("shorts") || titleLower.includes("t恤")) {
        score -= 25;
      }
    }

    // Приоритет розничным потребительским маркетплейсам над оптовым 1688
    if (["poizon", "95fen", "taobao", "tmall", "pinduoduo", "xianyu", "jd", "weidian"].includes(item.platform)) {
      score += 2;
    } else if (item.platform === "1688") {
      score -= 5; // Оптовая площадка — понижаем приоритет для розничных заказов
    }

    return { item, finalScore: score };
  });

  const valid = scored
    .filter((s) => s.finalScore > 0)
    .sort((a, b) => b.finalScore - a.finalScore);

  const uniqueItems: ApifyResultItem[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  for (const s of valid) {
    const u = s.item.url;
    const t = (s.item.title || "").toLowerCase().trim();
    if (seenUrls.has(u)) continue;
    if (t && seenTitles.has(t)) continue;
    seenUrls.add(u);
    if (t) seenTitles.add(t);

    uniqueItems.push(s.item);
    if (uniqueItems.length >= maxResults) break;
  }

  return uniqueItems;
}

async function callSearchProducts(query: string, platforms: string[] | undefined): Promise<unknown> {
  const url = `${SUPABASE_URL}/functions/v1/search-products`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ query, platforms }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`search-products ${res.status}`);
    return await res.json();
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    screenshotPath?: string;
    screenshotPaths?: string[];
    descriptionHint?: string;
    platforms?: string[];
  } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Support both single screenshotPath and array screenshotPaths
  const allPaths: string[] = [];
  if (Array.isArray(body.screenshotPaths) && body.screenshotPaths.length > 0) {
    for (const p of body.screenshotPaths) {
      const trimmed = (p || "").trim();
      if (trimmed) allPaths.push(trimmed);
    }
  }
  // Fallback to single screenshotPath
  if (allPaths.length === 0) {
    const single = (body.screenshotPath || "").trim();
    if (single) allPaths.push(single);
  }

  if (allPaths.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "screenshotPath обязателен" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const descriptionHint = (body.descriptionHint || '').trim();
  const authenticity = (body.authenticity || 'all').toString();
  const condition = (body.condition || 'all').toString();
  const maxPrice = typeof body.maxPrice === 'number' && body.maxPrice > 0 ? body.maxPrice : null;

  let authenticity_tier: string | null = null;
  if (authenticity === 'replica') {
    authenticity_tier = 'replica';
  } else if (authenticity === 'original') {
    authenticity_tier = 'original';
  } else {
    const descLower = descriptionHint.toLowerCase();
    if (descLower.includes('копия') || descLower.includes('реплика') || descLower.includes('1:1') || descLower.includes('aaa') || descLower.includes('fake')) {
      authenticity_tier = 'replica';
    }
  }

  let requestedPlatforms = DEFAULT_PLATFORMS;
  if (condition === 'used') {
    // Для Б/У поиска — строго 95分 и Xianyu (Goofish)
    requestedPlatforms = ["95fen", "xianyu"];
  } else if (Array.isArray(body.platforms) && body.platforms.length > 0) {
    requestedPlatforms = body.platforms;
  }

  const allowedKeys = new Set(requestedPlatforms);

  // 1. Signed URLs (10 мин) для всех фото
  const signedImageUrls: string[] = [];
  for (const p of allPaths) {
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(p, 600);
    
    if (signedErr || !signedData?.signedUrl) {
      console.error(`Failed to sign ${p}:`, signedErr?.message);
      continue; // skip broken uploads, don't fail the whole request
    }
    signedImageUrls.push(signedData.signedUrl);
  }

  if (signedImageUrls.length === 0) {
    return new Response(
      JSON.stringify({ ok: false, error: "Не удалось получить URL ни одного изображения" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Параллельно запускаем мульти-фото Vision анализ по всем загруженным снимкам
  let visionDetails: { brand: string | null; product_type: string | null; color: string | null; query: string } = {
    brand: null, product_type: null, color: null, query: ""
  };
  try {
    visionDetails = await describeProductForSearch(signedImageUrls);
  } catch (ve) {
    console.warn("Vision multi-photo analysis error:", ve);
  }

  // 2. PRIMARY: Apify Google Lens — визуальное распознавание + прямые ссылки на маркетплейсы
  //    Передаём ВСЕ фото — Apify объединит результаты
  const apifyResp = await searchByImageViaApifyFull(signedImageUrls);
  const directMatches: ApifyResultItem[] = [];
  let lensTitle: string | null = null;
  if (apifyResp.ok) {
    // Direct matches на наших платформах
    for (const h of apifyResp.allHits) {
      const link = hitUrl(h);
      if (!link || !/^https?:\/\//i.test(link)) continue;
      const platform = platformForUrl(link);
      if (!platform) continue;

      // Если реплика — исключаем Poizon (Dewu) и 95fen, так как там продаётся только оригинал
      if (authenticity_tier === 'replica' && (platform.key === 'poizon' || platform.key === '95fen')) {
        continue;
      }

      if (allowedKeys.size > 0 && !allowedKeys.has(platform.key)) continue;
      const { price, currency } = priceFromText(h.price);
      directMatches.push({
        platform: platform.key,
        platform_label: platform.label,
        flag: platform.flag,
        title: hitTitle(h),
        url: link,
        price,
        currency,
        image_url: hitImage(h),
        score: apifyResp.exactUrls.has(link) ? 3 : 2,
      });
    }
    // Lens title — название товара которое распознал Google Lens
    for (const h of apifyResp.allHits) {
      const t = hitTitle(h);
      if (t && t.length >= 8 && t.length <= 120) {
        if (/See exact matches|See similar|See more|Search the web/i.test(t)) continue;
        lensTitle = t;
        break;
      }
    }
  }

  // 3. SECONDARY: search-products с распознанным PDD-сленгом / Lens / Vision названием (+ descriptionHint)
  let searchProductsResults: ApifyResultItem[] = [];
  const fusedQuery = [visionDetails.pdd_query || lensTitle || visionDetails.query, descriptionHint].filter(Boolean).join(" ").trim();
  if (fusedQuery) {
    try {
      const sp = await callSearchProducts(fusedQuery, requestedPlatforms);
      const spData = sp as { ok?: boolean; results?: Array<Record<string, unknown>>; authenticity_tier?: string | null };
      if (spData.authenticity_tier) {
        authenticity_tier = spData.authenticity_tier;
      }
      if (spData.ok && Array.isArray(spData.results)) {
        for (const r of spData.results) {
          const url = String(r.url || "");
          if (!url) continue;
          const platform = platformForUrl(url);
          if (!platform) continue;
          if (authenticity_tier === 'replica' && (platform.key === 'poizon' || platform.key === '95fen')) continue;
          if (directMatches.some((d) => d.url === url)) continue; // dedup
          searchProductsResults.push({
            platform: platform.key,
            platform_label: platform.label,
            flag: platform.flag,
            title: String(r.title || lensTitle || fusedQuery),
            url,
            price: typeof r.price === "number" ? r.price : null,
            currency: typeof r.currency === "string" ? r.currency : null,
            image_url: typeof r.image_url === "string" ? r.image_url : null,
            score: 1,
          });
        }
      }
    } catch (_e) {
      // ignore
    }
  }

  const combined = [...directMatches, ...searchProductsResults];
  const visuallyVerifiedCombined = await verifyCandidatesVisuallyWithAI(signedImageUrls[0], combined);
  const top4Results = filterAndRankTopResults(visuallyVerifiedCombined, visionDetails, descriptionHint, 4, maxPrice);

  if (top4Results.length >= 1) {
    return new Response(
      JSON.stringify({
        ok: true,
        source: lensTitle ? "apify+search-products" : "apify",
        query: lensTitle || visionDetails.query,
        platforms: requestedPlatforms,
        total: top4Results.length,
        results: top4Results,
        authenticity_tier,
        apify_raw_count: apifyResp.raw_count,
        apify_direct: directMatches.length,
        from_search: searchProductsResults.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 4. FALLBACK: Vision API + search-products
  if (!visionDetails.query || visionDetails.query.length < 3) {
    return new Response(
      JSON.stringify({
        ok: false,
        source: "vision-fallback",
        error: "Не удалось распознать товар на фото. Попробуйте более чёткое изображение или используйте поиск по описанию.",
        vision_query: visionDetails.query,
        authenticity_tier: authenticity_tier,
        apify_error: apifyResp.error || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const visionFusedQuery = [visionDetails.query, descriptionHint].filter(Boolean).join(" ").trim();
  let searchResp;
  try {
    searchResp = await callSearchProducts(visionFusedQuery, requestedPlatforms);
  } catch (e) {
    return new Response(
      JSON.stringify({
        ok: false,
        source: "vision-fallback",
        error: `search-products: ${(e as Error).message}`,
        vision_query: visionDetails.query,
        apify_error: apifyResp.error || null,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const rawFallbackList = ((searchResp as Record<string, unknown>)?.results || []) as ApifyResultItem[];
  const visuallyVerifiedFallback = await verifyCandidatesVisuallyWithAI(signedImageUrls[0], rawFallbackList);
  const finalFallbackTop4 = filterAndRankTopResults(visuallyVerifiedFallback, visionDetails, descriptionHint, 4, maxPrice);

  return new Response(
    JSON.stringify({
      ...(searchResp as Record<string, unknown>),
      source: "vision-fallback",
      vision_query: visionDetails.query,
      vision_brand: visionDetails.brand,
      vision_product_type: visionDetails.product_type,
      vision_category: visionDetails.category,
      vision_color: visionDetails.color,
      total: finalFallbackTop4.length,
      results: finalFallbackTop4,
      authenticity_tier: authenticity_tier || (searchResp as any)?.authenticity_tier || null,
      apify_error: apifyResp.error || null,
      apify_raw_count: apifyResp.raw_count,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
