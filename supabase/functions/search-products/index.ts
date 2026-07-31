// supabase/functions/search-products/index.ts
// ICE LOGIX — search-products v1.0
//
// Поиск товара по текстовому запросу одновременно на нескольких площадках.
// Используется для режима «Найти товар по описанию» в Mini App.
//
// Поток:
//   1. Принимает query (текст) + опциональный platforms[] (список ID площадок)
//   2. Для каждой площадки строит Google-style запрос с site:filter
//   3. Параллельно отправляет в Firecrawl /v2/search → получает top-3 ссылок
//   4. Для топ-результатов (с markdown) — извлекает price/title через DeepSeek
//   5. Возвращает агрегированный массив [{ platform, title, price, currency, url, image_url, score }]
//
// Использование:
//   POST /functions/v1/search-products
//   Authorization: Bearer <SUPABASE_ANON_KEY>
//   Body: { "query": "Nike Dunk Low Panda 42", "platforms": ["poizon","zalando","wildberries"] }
//
// Требуемые secrets:
//   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
//   - FIRECRAWL_API_KEY (sk-...) — используется для search + scrape
//   - DEEPSEEK_API_KEY (sk-...) — для извлечения price/title из markdown
//
// Версия: 2026.05.08.01

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── ENV ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const TEXT_MODEL = Deno.env.get("OPENROUTER_TEXT_MODEL") || "anthropic/claude-sonnet-4.6";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── ПЛОЩАДКИ ────────────────────────────────────────────────────────────────
type PlatformConfig = {
  id: string;
  label: string;
  flag: string;
  domain: string;
  // Дополнительные слова для уточнения (например "купить" для рус. сайтов)
  qualifiers?: string;
  defaultCurrency?: string;
};

const PLATFORMS: PlatformConfig[] = [
  // 🇨🇳 Китай — все основные торговые площадки (недоступны напрямую из Беларуси)
  { id: "poizon", label: "Poizon / Dewu", flag: "🇨🇳", domain: "dewu.com", defaultCurrency: "CNY" },
  { id: "95fen", label: "95分", flag: "🇨🇳", domain: "95fen.com", defaultCurrency: "CNY" },
  { id: "taobao", label: "Taobao", flag: "🇨🇳", domain: "taobao.com", defaultCurrency: "CNY" },
  { id: "tmall", label: "Tmall", flag: "🇨🇳", domain: "tmall.com", defaultCurrency: "CNY" },
  { id: "1688", label: "1688", flag: "🇨🇳", domain: "1688.com", defaultCurrency: "CNY" },
  { id: "jd", label: "JD.com", flag: "🇨🇳", domain: "jd.com", defaultCurrency: "CNY" },
  { id: "pinduoduo", label: "Pinduoduo", flag: "🇨🇳", domain: "pinduoduo.com", defaultCurrency: "CNY" },
  { id: "xianyu", label: "Xianyu (闲鱼)", flag: "🇨🇳", domain: "goofish.com", defaultCurrency: "CNY" },
  { id: "xiaohongshu", label: "Xiaohongshu (小红书)", flag: "🇨🇳", domain: "xiaohongshu.com", defaultCurrency: "CNY" },
  { id: "weidian", label: "Weidian (微店)", flag: "🇨🇳", domain: "weidian.com", defaultCurrency: "CNY" },
  { id: "dhgate", label: "DHGate", flag: "🇨🇳", domain: "dhgate.com", defaultCurrency: "USD" },
  { id: "aliexpress", label: "AliExpress", flag: "🇨🇳", domain: "aliexpress.com", defaultCurrency: "USD" },
  // 🇪🇺 Европа / ЕС
  { id: "zalando", label: "Zalando", flag: "🇵🇱", domain: "zalando.pl", defaultCurrency: "EUR" },
  { id: "aboutyou", label: "About You", flag: "🇩🇪", domain: "aboutyou.com", defaultCurrency: "EUR" },
  { id: "asos", label: "ASOS", flag: "🇬🇧", domain: "asos.com", defaultCurrency: "EUR" },
  { id: "farfetch", label: "Farfetch", flag: "🇪🇺", domain: "farfetch.com", defaultCurrency: "EUR" },
  { id: "endclothing", label: "END.", flag: "🇬🇧", domain: "endclothing.com", defaultCurrency: "GBP" },
  { id: "mrporter", label: "Mr Porter", flag: "🇬🇧", domain: "mrporter.com", defaultCurrency: "GBP" },
  { id: "mytheresa", label: "Mytheresa", flag: "🇩🇪", domain: "mytheresa.com", defaultCurrency: "EUR" },
  { id: "ssense", label: "SSENSE", flag: "🇨🇦", domain: "ssense.com", defaultCurrency: "EUR" },
  { id: "vinted", label: "Vinted", flag: "🇪🇺", domain: "vinted.com", defaultCurrency: "EUR" },
  { id: "sneakerstudio", label: "SneakerStudio", flag: "🇵🇱", domain: "sneakerstudio.com", defaultCurrency: "EUR" },
  // 🇺🇸 США (sneaker / streetwear)
  { id: "goat", label: "GOAT", flag: "🇺🇸", domain: "goat.com", defaultCurrency: "USD" },
  { id: "stockx", label: "StockX", flag: "🇺🇸", domain: "stockx.com", defaultCurrency: "USD" },
  // 🇯🇵 Япония / Азия
  { id: "mercari", label: "Mercari", flag: "🇯🇵", domain: "mercari.com", defaultCurrency: "USD" },
  // 🇷🇺 Россия — оставлены, но НЕ в дефолте (работают в Беларуси, клиент закажет сам)
  { id: "wildberries", label: "Wildberries", flag: "🇷🇺", domain: "wildberries.ru", qualifiers: "купить", defaultCurrency: "RUB" },
  { id: "lamoda", label: "Lamoda", flag: "🇷🇺", domain: "lamoda.ru", qualifiers: "купить", defaultCurrency: "RUB" },
  { id: "ozon", label: "Ozon", flag: "🇷🇺", domain: "ozon.ru", qualifiers: "купить", defaultCurrency: "RUB" },
];

// Дефолт — все площадки недоступные напрямую в Беларуси.
// WB/Lamoda/Ozon исключены — клиент закажет сам, посредник не нужен.
const DEFAULT_PLATFORMS = [
  "poizon", "95fen", "taobao", "tmall", "1688", "jd", "pinduoduo", "xianyu", "xiaohongshu", "weidian", "dhgate", "aliexpress",
  "zalando", "aboutyou", "asos", "farfetch", "endclothing",
  "mrporter", "mytheresa", "ssense", "vinted", "sneakerstudio",
  "goat", "stockx", "mercari",
];

function getPlatform(id: string): PlatformConfig | null {
  return PLATFORMS.find((p) => p.id === id) ?? null;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function parseAssistantJson(raw: string): Record<string, unknown> {
  let s = (raw || "").trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/s, "").trim();
  }
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeCurrency(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const u = raw.trim().toUpperCase();
  if (u === "$" || u === "USD") return "USD";
  if (u === "€" || u === "EUR") return "EUR";
  if (u === "¥" || u === "CNY" || u === "RMB" || u === "元") return "CNY";
  if (u === "£" || u === "GBP") return "GBP";
  if (u === "₽" || u === "RUB" || u === "RUR" || u === "РУБ") return "RUB";
  if (u === "BYN" || u === "BYR") return "BYN";
  if (/^[A-Z]{3}$/.test(u)) return u;
  return null;
}

function extractPriceFromMarkdown(md: string): { price: number | null; currency: string | null } {
  const m = md.match(
    /(\d[\d\s]*[\.,]\d{1,2}|\d{2,})\s*(USD|EUR|CNY|GBP|BYN|RUB|\$|€|¥|£|₽|руб|元)/i,
  );
  if (m) {
    const price = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
    if (!isNaN(price) && price > 0) {
      return { price, currency: normalizeCurrency(m[2]) };
    }
  }
  return { price: null, currency: null };
}

function extractFirstImageUrl(md: string): string | null {
  const m = md.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  return m ? m[1] : null;
}

// ─── FIRECRAWL SEARCH ────────────────────────────────────────────────────────
type SearchHit = {
  url: string;
  title: string;
  description: string | null;
  markdown: string | null;
};

async function firecrawlSearch(query: string, limit: number): Promise<SearchHit[]> {
  if (!FIRECRAWL_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FIRECRAWL_KEY}`,
      },
      body: JSON.stringify({
        query,
        limit,
        sources: ["web"],
        scrapeOptions: { formats: [{ type: "markdown" }, { type: "summary" }] },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "<no body>");
      throw new Error(`Firecrawl /search ${res.status}: ${errText.substring(0, 200)}`);
    }
    const json = await res.json();
    const data = (json && typeof json === "object" ? json.data : null) as
      | { web?: unknown[]; news?: unknown[]; images?: unknown[] }
      | unknown[]
      | null;
    let list: Record<string, unknown>[] = [];
    if (Array.isArray(data)) {
      list = data as Record<string, unknown>[];
    } else if (data && typeof data === "object") {
      const web = (data as { web?: unknown[] }).web;
      if (Array.isArray(web)) list = web as Record<string, unknown>[];
    } else if (Array.isArray((json as Record<string, unknown>)?.web)) {
      list = (json as { web: Record<string, unknown>[] }).web;
    }
    return list.map((it: Record<string, unknown>) => ({
      url: String(it.url ?? ""),
      title: String(it.title ?? "").substring(0, 200),
      description: typeof it.description === "string" ? it.description : null,
      markdown: typeof it.markdown === "string" ? it.markdown : null,
    })).filter((h: SearchHit) => h.url);
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

// ─── DEEPSEEK EXTRACT (lite) ─────────────────────────────────────────────────
async function extractFromMarkdown(
  md: string,
  fallbackTitle: string,
): Promise<{ title: string | null; price: number | null; currency: string | null }> {
  if (!OPENROUTER_KEY || !md) {
    const fb = extractPriceFromMarkdown(md || "");
    return { title: fallbackTitle || null, price: fb.price, currency: fb.currency };
  }

  const prompt = `Извлеки из Markdown ниже название товара, текущую цену и валюту.
Верни ТОЛЬКО валидный JSON без markdown-обёрток с полями:
- title (string|null) — полное название товара
- price (number|null) — текущая цена-число (без символов)
- currency (string|null) — ISO 4217: USD/EUR/CNY/GBP/RUB/BYN

Если несколько цен (старая/новая) — бери ТЕКУЩУЮ (sale/со скидкой).
Если ничего внятного нет — null.

Markdown:
${md.substring(0, 6000)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
    const data = await res.json();
    const parsed = parseAssistantJson(String(data.choices?.[0]?.message?.content ?? ""));
    const title = (typeof parsed.title === "string" && parsed.title.trim())
      ? parsed.title.trim()
      : (fallbackTitle || null);
    let price: number | null = null;
    if (typeof parsed.price === "number" && parsed.price > 0) price = parsed.price;
    else if (parsed.price != null) {
      const n = parseFloat(String(parsed.price).replace(/\s/g, "").replace(",", "."));
      if (!isNaN(n) && n > 0) price = n;
    }
    const currency = normalizeCurrency(typeof parsed.currency === "string" ? parsed.currency : null);
    return { title, price, currency };
  } catch (_e) {
    clearTimeout(timeoutId);
    const fb = extractPriceFromMarkdown(md);
    return { title: fallbackTitle || null, price: fb.price, currency: fb.currency };
  }
}

// ─── LLM QUERY ENHANCER (Claude Sonnet 4.6 через OpenRouter) ────────────────
// Берёт сырой запрос пользователя ("зип худи кляйн копия серый мужской")
// и превращает в нормализованный поисковый запрос на английском
// ("Calvin Klein zip hoodie men gray") + извлекает brand/category для re-ranking.
async function enhanceQuery(raw: string): Promise<{
  enhanced_en: string;
  enhanced_ru: string;
  enhanced_zh: string;
  brand: string | null;
  category: string | null;
  authenticity_tier: "original" | "replica";
  ok: boolean;
}> {
  const fallback = { enhanced_en: raw, enhanced_ru: raw, enhanced_zh: raw, brand: null, category: null, authenticity_tier: "original" as const, ok: false };
  if (!OPENROUTER_KEY) return fallback;

  const prompt = `Ты помогаешь искать товары в международных и китайских интернет-магазинах.

Пользователь ввёл запрос на любом языке (часто кратко, с опечатками, разговорно).
Твоя задача — нормализовать запрос для поиска по сайтам типа zalando.com, asos.com, poizon.com (Dewu), taobao.com, 1688.com, pinduoduo.com и т.д.

Правила:
- Определи authenticity_tier:
  * "replica" если в запросе есть "копия", "реплика", "1:1", "fake", "replica", "копия 1:1", "ААА", "AAA"
  * "original" во всех остальных случаях (по умолчанию)
- Сформируй:
  * enhanced_en: английский поисковый запрос (например "Polo Ralph Lauren zip hoodie men gray")
  * enhanced_ru: русский поисковый запрос (например "Polo Ralph Lauren худи на молнии серое")
  * enhanced_zh: запрос на УПРОЩЁННОМ КИТАЙСКОМ (简体中文) для поиска по китайским сайтам (Taobao, 1688, Dewu, Pinduoduo, Xianyu). Переводи бренды и типы одежды на китайский (например: Polo Ralph Lauren → 拉夫劳伦, Nike Air Force 1 → 耐克空军一号, худи → 连帽卫衣, кроссовки → 运动鞋)
- Если authenticity_tier="replica": ОСТАВЬ в enhanced_en слово "replica", а в enhanced_zh добавь "复刻" / "1:1"
- Если authenticity_tier="original": НЕ добавляй слово "replica" / "копия" / "复刻" в результат

Запрос пользователя: """${raw}"""

Верни ТОЛЬКО валидный JSON (никаких markdown-оборок), пример формата:
{"enhanced_en":"Calvin Klein zip hoodie men gray","enhanced_ru":"Calvin Klein худи на молнии мужское серое","enhanced_zh":"CK 卡尔文克莱恩 灰色 连帽拉链卫衣","brand":"Calvin Klein","category":"hoodie","authenticity_tier":"original"}

Если запрос непонятен — верни {"enhanced_en":"${raw}","enhanced_ru":"${raw}","enhanced_zh":"${raw}","brand":null,"category":null,"authenticity_tier":"original"}.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 250,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return fallback;
    const data = await res.json();
    const parsed = parseAssistantJson(String(data.choices?.[0]?.message?.content ?? ""));
    const en = typeof parsed.enhanced_en === "string" && parsed.enhanced_en.trim() ? parsed.enhanced_en.trim() : raw;
    const ru = typeof parsed.enhanced_ru === "string" && parsed.enhanced_ru.trim() ? parsed.enhanced_ru.trim() : raw;
    const zh = typeof parsed.enhanced_zh === "string" && parsed.enhanced_zh.trim() ? parsed.enhanced_zh.trim() : raw;
    const tier: "original" | "replica" =
      parsed.authenticity_tier === "replica" ? "replica" : "original";
    return {
      enhanced_en: en,
      enhanced_ru: ru,
      enhanced_zh: zh,
      brand: typeof parsed.brand === "string" && parsed.brand.trim() ? parsed.brand.trim() : null,
      category: typeof parsed.category === "string" && parsed.category.trim() ? parsed.category.trim() : null,
      authenticity_tier: tier,
      ok: true,
    };
  } catch {
    clearTimeout(timeoutId);
    return fallback;
  }
}

// Какой язык запроса использовать для какой платформы
function queryLangForPlatform(platformId: string): "en" | "ru" | "zh" {
  // RU площадки → русский
  if (["wildberries", "lamoda", "ozon"].includes(platformId)) return "ru";
  // Китайские площадки → упрощённый китайский (简体中文) для точного поиска товарных карточек
  if (["poizon", "95fen", "taobao", "tmall", "1688", "jd", "pinduoduo", "xianyu", "weidian", "xiaohongshu"].includes(platformId)) return "zh";
  // Все остальные международные → английский
  return "en";
}

// ─── ОДНА ПЛОЩАДКА ───────────────────────────────────────────────────────────
type SearchResult = {
  platform: string;
  platform_label: string;
  flag: string;
  url: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  score: number; // эвристика релевантности (1.0 — топ совпадение)
  error?: string;
};

async function searchOnePlatform(
  platform: PlatformConfig,
  queries: { en: string; ru: string; zh: string },
  topN: number,
): Promise<SearchResult[]> {
  // Выбираем язык запроса под язык площадки (zh для китайских, en для int'l, ru для WB/Lamoda/Ozon)
  const lang = queryLangForPlatform(platform.id);
  const baseQuery = (lang === "zh" ? queries.zh : lang === "en" ? queries.en : queries.ru).replace(/"/g, " ").trim();
  // БЕЗ кавычек — для fuzzy-матча по описанию (товарных PDP-страниц всё равно мало в каталоге).
  // qualifiers (например "купить" для рус.) добавляют контекст
  const fullQuery = `${baseQuery} ${platform.qualifiers || ""} site:${platform.domain}`.trim();
  let hits: SearchHit[] = [];
  try {
    hits = await firecrawlSearch(fullQuery, topN);
  } catch (e) {
    return [{
      platform: platform.id,
      platform_label: platform.label,
      flag: platform.flag,
      url: "",
      title: null,
      price: null,
      currency: null,
      image_url: null,
      score: 0,
      error: (e as Error).message,
    }];
  }

  if (hits.length === 0) return [];

  // Извлекаем title/price из top-N markdown'ов параллельно
  const enriched = await Promise.all(
    hits.slice(0, topN).map(async (hit, idx) => {
      const md = hit.markdown || "";
      const ex = await extractFromMarkdown(md, hit.title);
      const image = extractFirstImageUrl(md);
      return {
        platform: platform.id,
        platform_label: platform.label,
        flag: platform.flag,
        url: hit.url,
        title: ex.title,
        price: ex.price,
        currency: ex.currency || platform.defaultCurrency || null,
        image_url: image,
        score: 1 - idx * 0.15, // первый — 1.0, второй 0.85, третий 0.70
      } as SearchResult;
    }),
  );

  return enriched;
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

  let body: { query?: string; platforms?: string[]; topN?: number; user_id?: number | string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const query = (body.query || "").trim();
  if (!query || query.length < 3) {
    return new Response(
      JSON.stringify({ ok: false, error: "query: минимум 3 символа" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let requested = body.platforms && body.platforms.length > 0
    ? body.platforms
    : DEFAULT_PLATFORMS;

  if (body.user_id) {
    try {
      const { data: whitelist } = await supabase
        .from('user_marketplace_whitelist')
        .select('platform_slug')
        .eq('user_id', body.user_id)
        .eq('enabled', true);
      if (whitelist && whitelist.length > 0) {
        requested = whitelist.map(w => w.platform_slug);
      }
    } catch (e) {
      console.error("Whitelist error:", e);
    }
  }

  const platforms = requested
    .map((id) => getPlatform(id))
    .filter((p): p is PlatformConfig => p !== null);
  if (platforms.length === 0) {
    return new Response(
      JSON.stringify({ ok: false, error: "Не выбрано ни одной поддерживаемой площадки" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const topN = Math.min(Math.max(body.topN ?? 3, 1), 5);

  // 1. LLM-улучшение запроса (Claude Sonnet 4.6)
  // "зип худи кляйн копия серый мужской" → "Calvin Klein zip hoodie men gray"
  const enh = await enhanceQuery(query);
  const queries = { en: enh.enhanced_en, ru: enh.enhanced_ru, zh: enh.enhanced_zh };

  // 2. Replica Routing
  let finalPlatforms = platforms;
  if (enh.authenticity_tier === "replica") {
    // Dewu (Poizon) и 95fen продают только оригиналы — исключаем их при поиске реплик.
    const replicaIds = ["xianyu", "pinduoduo", "taobao", "1688", "dhgate", "aliexpress", "weidian"];
    finalPlatforms = replicaIds
      .map((id) => getPlatform(id))
      .filter((p): p is PlatformConfig => p !== null);
  } else {
    // Exclude replica-only platforms if not searching for a replica
    finalPlatforms = platforms.filter(p => !["dhgate", "aliexpress"].includes(p.id));
  }

  // Ограничиваем до 6 площадок за один поиск для предотвращения 429 Rate Limit от Firecrawl и ускорения работы
  if (finalPlatforms.length > 6) {
    finalPlatforms = finalPlatforms.slice(0, 6);
  }

  if (finalPlatforms.length === 0) {
    return new Response(
      JSON.stringify({ ok: false, error: "Нет площадок для данного типа товара" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 3. Параллельно по всем площадкам — каждая использует свой язык запроса
  const allResults: SearchResult[][] = await Promise.all(
    finalPlatforms.map((p) => searchOnePlatform(p, queries, topN).catch((e) => ([{
      platform: p.id,
      platform_label: p.label,
      flag: p.flag,
      url: "",
      title: null,
      price: null,
      currency: null,
      image_url: null,
      score: 0,
      error: (e as Error).message,
    } as SearchResult]))),
  );

  const results = allResults.flat();
  // Фильтруем homepage/category ссылки — только product page URLs
  const successful = results.filter((r) => {
    if (!r.url || !r.title) return false;
    try {
      const u = new URL(r.url);
      const path = u.pathname.replace(/\/+$/, "");
      // Убираем главные страницы и слишком короткие пути (обычно категории)
      if (!path || path === "" || path === "/" || path.split("/").filter(Boolean).length < 2) return false;
      // Убираем login/auth/about/help/faq страницы
      if (/\/(login|auth|register|about|help|faq|contact|privacy|terms)/i.test(path)) return false;
      return true;
    } catch {
      return false;
    }
  });

  return new Response(
    JSON.stringify({
      ok: true,
      query,
      enhanced_query: enh.ok ? enh.enhanced_en : null,
      brand: enh.brand,
      category: enh.category,
      authenticity_tier: enh.authenticity_tier,
      platforms: finalPlatforms.map((p) => p.id),
      total: successful.length,
      results: successful,
      errors: results.filter((r) => r.error).map((r) => ({ platform: r.platform, error: r.error })),
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
