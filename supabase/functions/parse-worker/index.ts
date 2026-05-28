// supabase/functions/parse-worker/index.ts
// ICE LOGIX — parse-worker v2.3.1
//
// Что нового по сравнению с v2.2:
//   • Apify-роутинг для платформ с гарантированными акторами:
//       - Taobao + Tmall (sian.agency/taobao-tmall-product-scraper) — $6/1000
//       - Temu (pear_fight/temu-scraper) — $1.50/1000
//       - Alibaba.com international (getdataforme/alibaba-product-profile-scraper) — $9/1000
//     Активируется при наличии APIFY_TOKEN в env. При отсутствии — fall-through
//     на старый Scrapfly/Mirror каскад (полная обратная совместимость с v2.2).
//     ВАЖНО: alibaba.com (international) ≠ 1688.com (Chinese domestic). Для 1688
//     используется Scrapfly из chinese tier (актор devcake — search-only, не URL-based).
//   • Для tier=app_only теперь сразу manual_required со screenshot-prompt,
//     БЕЗ попытки mirror через Sugargoo (он стабильно отдаёт homepage,
//     это просто трата Firecrawl-кредитов).
//   • 95fen.com добавлен в APP_ONLY_DOMAINS (вторая площадка от Dewu).
//   • error_message теперь содержит подсказку «приложите скриншот» для всех
//     manual_required кейсов — фронт показывает upload-виджет.
//
// Из v2.2:
//   • Taobao share-link'и (e.tb.cn, m.tb.cn), Poizon (dw4.co) — APP_ONLY.
//   • HTTP redirect follow ПЕРЕД классификацией.
//   • Блэклист мусорных title (viewport, alipay, 支付宝, login, 商品详情, ...).
//   • DeepSeek-промпт с инструкцией игнорировать login-page.
//
// Из v2 / v2.1:
//   • Убран параметр Scrapfly `timeout` (конфликтовал с retry=true → HTTP 400).
//   • Tier `app_only` для сайтов без данных товара на вебе.
//   • CHINESE_DOMAINS для desktop-страниц с anti-bot.
//   • Scrapfly с `rendering_wait=5000`, Firecrawl на mirror с `waitFor=5000`.
//   • Санитарный чек на homepage Sugargoo.
//   • Детект login-wall по содержимому.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Supabase ────────────────────────────────────────────────────────────────
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── API Keys ────────────────────────────────────────────────────────────────
const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";
const DEEPSEEK_KEY = Deno.env.get("DEEPSEEK_API_KEY") || "";
const CRAWLBASE_JS_TOKEN = Deno.env.get("CRAWLBASE_JS_TOKEN") || "";
const SCRAPFLY_API_KEY = Deno.env.get("SCRAPFLY_API_KEY") || "";
const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN") || "";

// ─── Domain classification ───────────────────────────────────────────────────

// Сайты, у которых на вебе нет данных товара (app-only / login-walled до бесполезности).
// Для них v2.3 сразу выдаёт manual_required с подсказкой загрузить скриншот.
const APP_ONLY_DOMAINS = [
  // Pinduoduo
  "pinduoduo.com", "yangkeduo.com", "pdd.com",
  // Poizon / Dewu deep-links (показывают app-promo / login)
  "fast.dewu.com", "dw4.co",
  // 95fen (95分) — вторая площадка от Dewu для подержанных оригиналов
  "95fen.com",
  // Taobao share-link'и (e.tb.cn → app, m.tb.cn → mobile с авторизацией)
  "e.tb.cn", "m.tb.cn", "tb.cn",
  "s.click.taobao.com", "click.taobao.com",
  // Xianyu (闲鱼) — app-only marketplace
  "goofish.com", "xianyu.com",
  // Xiaohongshu — app-only
  "xiaohongshu.com",
];

// Китайские сайты, у которых на вебе данные есть, но защита жёсткая.
const CHINESE_DOMAINS = [
  // Poizon / Dewu desktop
  "dewu.com", "poizon.com",
  // Taobao + Tmall desktop
  "taobao.com", "tmall.com", "h5.m.taobao.com",
  // 1688 / Alibaba
  "1688.com", "alibaba.com",
  // JD
  "jd.com", "jd.hk", "vip.com",
  // Прочие байер-релевантные китайские
  "weidian.com", "mogujie.com", "yougou.com", "yohobuy.com", "secoo.com",
];

// Сайты-посредники (у них есть нормальный rendered HTML после JS) — парсим как mirror.
const MIRROR_DOMAINS = [
  "sugargoo.com", "hoobuy.com", "kakobuy.com", "cssbuy.com",
  "allchinabuy.com", "superbuy.com", "wegobuy.com", "ootdbuy.com",
  "pandabuy.com", "lovegobuy.com", "basetao.com",
];

type Tier = "app_only" | "chinese" | "mirror" | "lite";

function classifyDomain(url: string): { tier: Tier; hostname: string } {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (APP_ONLY_DOMAINS.some((d) => hostname.includes(d))) return { tier: "app_only", hostname };
    if (MIRROR_DOMAINS.some((d) => hostname.includes(d))) return { tier: "mirror", hostname };
    if (CHINESE_DOMAINS.some((d) => hostname.includes(d))) return { tier: "chinese", hostname };
    return { tier: "lite", hostname };
  } catch {
    return { tier: "lite", hostname: "" };
  }
}

/**
 * Резолвит HTTP redirect (301/302) до финального URL. Используется для
 * коротких ссылок типа dw4.co → fast.dewu.com. JS-редиректы НЕ умеет —
 * их обрабатывают tier'ы.
 */
async function resolveRedirect(url: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (res.url && res.url !== url) return res.url;
  } catch { /* ignore */ }
  return url;
}

// Является ли URL «коротким» (имеет смысл пробовать резолвить редирект).
function isShortLink(url: string): boolean {
  try {
    const u = new URL(url);
    // Короткие ссылки обычно имеют короткий host или path < 30 символов
    return (
      u.hostname.length < 12 ||
      ["dw4.co", "e.tb.cn", "m.tb.cn", "tb.cn", "bit.ly", "t.co"].some((d) => u.hostname.includes(d))
    );
  } catch {
    return false;
  }
}

function marketplaceFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0] || null;
  } catch {
    return null;
  }
}

// ─── Apify integration ──────────────────────────────────────────────────────

interface ApifyExtraction {
  title: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  brand: string | null;
}

/** Извлекает Taobao/Tmall itemId из URL. Возвращает null если URL не каноничный. */
function extractTaobaoItemId(url: string): string | null {
  try {
    const u = new URL(url);
    // 1. Query param ?id=NNNNN — основной формат
    const id = u.searchParams.get("id");
    if (id && /^\d{6,}$/.test(id)) return id;
    // 2. Path-based: /item/NNNNN.htm
    const m = u.pathname.match(/(\d{8,})/);
    if (m) return m[1];
  } catch { /* ignore */ }
  return null;
}

/**
 * Запускает Apify-актор синхронно (run-sync-get-dataset-items) и возвращает
 * первый элемент датасета. Лимит времени ~60 сек на актор; если дольше —
 * выкинет таймаут (Apify будет продолжать выполнение, но мы не дождёмся).
 */
async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  log: (m: string) => void,
): Promise<Record<string, unknown> | null> {
  if (!APIFY_TOKEN) throw new Error("APIFY_TOKEN not configured");
  const url = `https://api.apify.com/v2/acts/${actorId.replace("/", "~")}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120`;
  log(`Apify: calling ${actorId} with input=${JSON.stringify(input)}`);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Apify HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }
    const items = (await res.json()) as Record<string, unknown>[];
    log(`Apify: returned ${items.length} items`);
    return items[0] || null;
  } finally {
    clearTimeout(timer);
  }
}

/** Маппит результат sian.agency Taobao actor в ApifyExtraction */
function mapTaobaoItem(item: Record<string, unknown>): ApifyExtraction {
  const status = typeof item.status === "string" ? item.status : "";
  if (status && status !== "success") return { title: null, price: null, currency: null, imageUrl: null, brand: null };
  const title = typeof item.title === "string" ? item.title.trim() : null;
  const priceYuan = typeof item.priceYuan === "number" ? item.priceYuan : null;
  const imageUrl = typeof item.imageUrl === "string" ? item.imageUrl : null;
  const brand = typeof item.brandName === "string" ? item.brandName : null;
  return {
    title: title || null,
    price: priceYuan && priceYuan > 0 ? priceYuan : null,
    currency: priceYuan && priceYuan > 0 ? "CNY" : null,
    imageUrl,
    brand,
  };
}

/** Маппит результат pear_fight Temu actor в ApifyExtraction */
function mapTemuItem(item: Record<string, unknown>): ApifyExtraction {
  const name = typeof item.name === "string" ? item.name.trim() : null;
  const priceRaw = item.price;
  let price: number | null = null;
  if (typeof priceRaw === "number" && priceRaw > 0) price = priceRaw;
  else if (typeof priceRaw === "string") {
    const n = parseFloat(priceRaw.replace(/[^\d.]/g, ""));
    if (!isNaN(n) && n > 0) price = n;
  }
  const imageUrl = typeof item.imageUrl === "string" ? item.imageUrl : null;
  return {
    title: name,
    price,
    currency: price ? "USD" : null,
    imageUrl,
    brand: null,
  };
}

/** Маппит результат getdataforme Alibaba.com actor в ApifyExtraction */
function mapAlibabaItem(item: Record<string, unknown>): ApifyExtraction {
  const name = typeof item.name === "string"
    ? item.name.trim()
    : (typeof item.title === "string" ? item.title.trim() : null);

  // Alibaba отдаёт массив offers — берём первый
  const offers = Array.isArray(item.offers) ? item.offers : [];
  const firstOffer = offers[0] as Record<string, unknown> | undefined;

  let price: number | null = null;
  let currency: string | null = null;

  if (firstOffer) {
    const p = firstOffer.price ?? firstOffer.lowPrice;
    if (typeof p === "number" && p > 0) price = p;
    else if (typeof p === "string") {
      const n = parseFloat(p.replace(/[^\d.]/g, ""));
      if (!isNaN(n) && n > 0) price = n;
    }
    const c = firstOffer.priceCurrency ?? firstOffer.currency;
    if (typeof c === "string" && c.trim()) currency = c.trim().toUpperCase();
  }

  // Fallback на root-level price
  if (price == null) {
    const p = item.price ?? item.lowPrice;
    if (typeof p === "number" && p > 0) price = p;
    else if (typeof p === "string") {
      const n = parseFloat(p.replace(/[^\d.]/g, ""));
      if (!isNaN(n) && n > 0) price = n;
    }
  }

  const images = Array.isArray(item.images) ? item.images : [];
  let imageUrl: string | null = null;
  if (images.length && typeof images[0] === "string") imageUrl = images[0] as string;
  else if (typeof item.image === "string") imageUrl = item.image;

  const brand = typeof item.brand === "string" ? item.brand : null;

  return {
    title: name,
    price,
    currency: currency || (price ? "USD" : null),
    imageUrl,
    brand,
  };
}

/**
 * Пробует получить данные через Apify-актор для данного URL.
 * Возвращает null если домен не подходит ни под один актор / нет токена.
 * Бросает исключение только при сетевой/API ошибке внутри актора.
 */
async function tryApify(
  url: string,
  hostname: string,
  log: (m: string) => void,
): Promise<{ data: ApifyExtraction; method: string } | null> {
  if (!APIFY_TOKEN) return null;

  // Taobao + Tmall (canonical desktop URL only — share-link'и в APP_ONLY)
  if (
    hostname.includes("item.taobao.com") ||
    hostname.includes("detail.tmall.com") ||
    hostname.endsWith(".taobao.com") ||
    hostname.endsWith(".tmall.com") ||
    hostname === "taobao.com" || hostname === "tmall.com"
  ) {
    const itemId = extractTaobaoItemId(url);
    if (!itemId) {
      log(`Apify Taobao: no itemId in URL, skipping`);
      return null;
    }
    const item = await runApifyActor(
      "sian.agency/taobao-tmall-product-scraper",
      { operation: "productDetail", itemId, detailVersion: "v1" },
      log,
    );
    if (!item) return null;
    return { data: mapTaobaoItem(item), method: "apify_taobao" };
  }

  // Temu
  if (hostname.includes("temu.com")) {
    const item = await runApifyActor(
      "pear_fight/temu-scraper",
      { productUrls: [url], maxResults: 1 },
      log,
    );
    if (!item) return null;
    return { data: mapTemuItem(item), method: "apify_temu" };
  }

  // Alibaba.com (international, английский UI; НЕ 1688.com — это другая платформа)
  if (
    hostname === "alibaba.com" ||
    hostname === "www.alibaba.com" ||
    hostname.endsWith(".alibaba.com")
  ) {
    const item = await runApifyActor(
      "getdataforme/alibaba-product-profile-scraper",
      { startUrls: [{ url }] },
      log,
    );
    if (!item) return null;
    return { data: mapAlibabaItem(item), method: "apify_alibaba" };
  }

  return null;
}

// ─── JSON helper (strips ```json fences) ─────────────────────────────────────
function parseAssistantJson(raw: string): Record<string, unknown> {
  let s = (raw || "").trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/s, "").trim();
  }
  return JSON.parse(s) as Record<string, unknown>;
}

// ─── Mirror URL builder ──────────────────────────────────────────────────────
function buildMirrorUrl(originalUrl: string): string {
  const encoded = encodeURIComponent(originalUrl);
  return `https://www.sugargoo.com/index/item/index.html?productLink=${encoded}`;
}

// ─── Login-wall detector ─────────────────────────────────────────────────────
/**
 * Возвращает true, если контент похож на login-wall / app-only заглушку:
 * - очень маленький HTML (<10кб) с ключевыми словами login/登录
 * - JSON с needLogin:true
 * - редирект на app store
 */
function isLoginWall(content: string): boolean {
  if (!content) return true;
  if (content.length < 10000) {
    const lower = content.toLowerCase();
    if (
      lower.includes("login") ||
      lower.includes("sign in") ||
      content.includes("登录") ||
      content.includes("请登录") ||
      content.includes("needLogin\":true") ||
      content.includes('"needLogin":true')
    ) {
      return true;
    }
  }
  return false;
}

// ─── Sugargoo homepage detector ──────────────────────────────────────────────
/**
 * Если экстрактор вернул title явно из шапки Sugargoo — считаем что mirror
 * не сработал и нужно идти дальше.
 */
function isSugargooHomepageTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  return (
    lower.includes("one-stop agent purchasing") ||
    lower.includes("sugargoo") ||
    lower.includes("best taobao agent") ||
    lower.includes("agent shipping")
  );
}

/**
 * Блэклист «мусорных» title — имена мета-тэгов, провайдеров логина,
 * generic названий страниц / сайтов. Если DeepSeek или regex-fallback
 * вернули такое — это не товар, а login-page или редирект.
 */
const GARBAGE_TITLE_PATTERNS: RegExp[] = [
  /^viewport$/i,
  /^description$/i,
  /^keywords$/i,
  /^robots$/i,
  /^charset$/i,
  /^author$/i,
  /^alipay$/i,
  /支付宝/,
  /^login$/i,
  /sign\s*in/i,
  /登录/,
  /请登录/,
  /^404$/,
  /not\s*found/i,
  /^error$/i,
  /^loading\.?\.?\.?$/i,
  /加载中/,
  /^productDetail$/i,
  /^product\s*detail$/i,
  /^商品详情$/,
  /^拼多多$/,
  /^得App/,
  /^得物/,
  /^Taobao$/i,
  /^Tmall$/i,
  /^淘宝$/,
  /^天猫$/,
  /^JD\.com$/i,
  /^京东$/,
  /open\s+in\s+app/i,
  /打开APP/,
];

function isGarbageTitle(title: string | null | undefined): boolean {
  if (!title) return true;
  const t = title.trim();
  if (t.length < 3) return true;
  return GARBAGE_TITLE_PATTERNS.some((re) => re.test(t));
}

// ─── Content fetchers ────────────────────────────────────────────────────────

/** Scrapfly Web Unblocker — primary для китайских сайтов */
async function fetchViaScrapfly(
  url: string,
  options: { country?: string; renderingWait?: number } = {},
): Promise<string> {
  if (!SCRAPFLY_API_KEY) throw new Error("SCRAPFLY_API_KEY not configured");
  const params = new URLSearchParams({
    key: SCRAPFLY_API_KEY,
    url,
    asp: "true",                 // Anti Scraping Protection bypass
    render_js: "true",           // полноценный headless рендер
    country: options.country || "cn",
  });
  if (options.renderingWait) {
    params.set("rendering_wait", String(options.renderingWait));
  }
  const res = await fetch(`https://api.scrapfly.io/scrape?${params.toString()}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const m = data?.message || data?.error?.message || res.statusText;
    throw new Error(`Scrapfly HTTP ${res.status}: ${m}`);
  }
  if (!data?.result?.success) {
    const code = data?.result?.status_code ?? "n/a";
    const reason =
      data?.result?.reason ||
      data?.result?.error?.message ||
      data?.message ||
      "unknown";
    throw new Error(`Scrapfly target failed (HTTP ${code}): ${reason}`);
  }
  const html = data.result.content || "";
  if (!html || html.length < 200) throw new Error("Scrapfly returned empty content");
  return html;
}

/** Crawlbase JS-render — оставлен как fallback на случай если есть токен */
async function fetchViaCrawlbase(url: string): Promise<string> {
  if (!CRAWLBASE_JS_TOKEN) throw new Error("CRAWLBASE_JS_TOKEN not configured");
  const apiUrl =
    `https://api.crawlbase.com/?token=${CRAWLBASE_JS_TOKEN}&url=${encodeURIComponent(url)}`;
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`Crawlbase ${res.status}`);
  const text = await res.text();
  if (!text || text.trim().length < 200) throw new Error("Crawlbase empty/short");
  return text;
}

/** Firecrawl → Markdown. Опционально с waitFor (для SPA). */
async function fetchViaFirecrawl(url: string, waitForMs?: number): Promise<string> {
  if (!FIRECRAWL_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
  const body: Record<string, unknown> = { url, formats: ["markdown"] };
  if (waitForMs && waitForMs > 0) body.waitFor = waitForMs;
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${FIRECRAWL_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}`);
  const { data } = await res.json();
  const md = data?.markdown || "";
  if (!md || md.trim().length < 100) throw new Error("Firecrawl returned empty/short markdown");
  return md;
}

/** Last resort: codetabs proxy → raw HTML, потом direct fetch с UA */
async function fetchViaFallback(url: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    );
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 200) return text;
    }
  } catch { /* continue */ }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  if (res.ok) return await res.text();
  throw new Error(`All fetch attempts failed (status ${res.status})`);
}

// ─── Fetch orchestration ─────────────────────────────────────────────────────

interface FetchResult {
  content: string;
  method: string;
  effectiveUrl: string;
}

async function fetchContent(
  url: string,
  log: (m: string) => void,
): Promise<FetchResult> {
  const { tier, hostname } = classifyDomain(url);
  log(`Tier: ${tier}, host: ${hostname}`);

  // ─── APP_ONLY TIER ─────────────────────────────────────────────────────────
  // На таких доменах данных товара на вебе нет (только в приложении).
  // Mirror через Sugargoo стабильно отдаёт свою homepage — поэтому сразу
  // пробрасываем APP_ONLY_NO_DATA, в main handler пойдёт manual_required
  // со screenshot-prompt.
  if (tier === "app_only") {
    log(`app_only → skipping fetch, will request screenshot upload`);
    throw new Error("APP_ONLY_NO_DATA");
  }

  // ─── CHINESE TIER ──────────────────────────────────────────────────────────
  if (tier === "chinese") {
    // 1. Scrapfly Web Unblocker — основной канал, с rendering_wait
    if (SCRAPFLY_API_KEY) {
      try {
        const html = await fetchViaScrapfly(url, {
          country: "cn",
          renderingWait: 5000,
        });
        if (isLoginWall(html)) {
          log(`Scrapfly returned login-wall (${html.length} chars), skipping`);
        } else {
          log(`Scrapfly OK, ${html.length} chars`);
          return { content: html, method: "scrapfly", effectiveUrl: url };
        }
      } catch (e) {
        log(`Scrapfly failed: ${(e as Error).message}`);
      }
    }

    // 2. Mirror через Sugargoo → Firecrawl с waitFor
    try {
      const mirrorUrl = buildMirrorUrl(url);
      log(`Trying mirror: ${mirrorUrl}`);
      const md = await fetchViaFirecrawl(mirrorUrl, 5000);
      log(`Mirror+Firecrawl OK, ${md.length} chars`);
      return { content: md, method: "mirror_sugargoo", effectiveUrl: mirrorUrl };
    } catch (e) {
      log(`Mirror failed: ${(e as Error).message}`);
    }

    // 3. Crawlbase (если есть токен)
    if (CRAWLBASE_JS_TOKEN) {
      try {
        const html = await fetchViaCrawlbase(url);
        log(`Crawlbase OK, ${html.length} chars`);
        return { content: html, method: "crawlbase", effectiveUrl: url };
      } catch (e) {
        log(`Crawlbase failed: ${(e as Error).message}`);
      }
    }

    // 4. Firecrawl напрямую
    try {
      const md = await fetchViaFirecrawl(url);
      log(`Firecrawl direct OK (Chinese), ${md.length} chars`);
      return { content: md, method: "firecrawl_direct", effectiveUrl: url };
    } catch (e) {
      log(`Firecrawl direct failed: ${(e as Error).message}`);
    }

    // 5. codetabs/direct
    try {
      const fb = await fetchViaFallback(url);
      log(`Fallback OK (Chinese), ${fb.length} chars`);
      return { content: fb, method: "fallback", effectiveUrl: url };
    } catch (e) {
      log(`Fallback failed: ${(e as Error).message}`);
    }

    throw new Error("CHINESE_ALL_FAILED");
  }

  // ─── MIRROR TIER ───────────────────────────────────────────────────────────
  if (tier === "mirror") {
    try {
      const md = await fetchViaFirecrawl(url, 5000);
      log(`Firecrawl OK (mirror site), ${md.length} chars`);
      return { content: md, method: "firecrawl", effectiveUrl: url };
    } catch (e) {
      log(`Firecrawl failed (mirror): ${(e as Error).message}`);
    }
    const fb = await fetchViaFallback(url);
    return { content: fb, method: "fallback", effectiveUrl: url };
  }

  // ─── LITE TIER ─────────────────────────────────────────────────────────────
  try {
    const md = await fetchViaFirecrawl(url);
    log(`Firecrawl OK, ${md.length} chars`);
    return { content: md, method: "firecrawl", effectiveUrl: url };
  } catch (e) {
    log(`Firecrawl failed: ${(e as Error).message}`);
  }

  log("Trying codetabs/direct fallback...");
  const fb = await fetchViaFallback(url);
  log(`Fallback OK, ${fb.length} chars`);
  return { content: fb, method: "fallback", effectiveUrl: url };
}

// ─── Currency normalizer ─────────────────────────────────────────────────────
function normalizeCurrency(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const u = raw.trim().toUpperCase();
  if (u === "$" || u === "USD") return "USD";
  if (u === "€" || u === "EUR") return "EUR";
  if (u === "¥" || u === "CNY" || u === "RMB") return "CNY";
  if (u === "£" || u === "GBP") return "GBP";
  if (u === "₽" || u === "RUB" || u === "RUR") return "RUB";
  if (u === "BYN" || u === "BYR") return "BYN";
  if (/^[A-Z]{3}$/.test(u)) return u;
  return null;
}

function extractCurrencyFromContent(content: string): string | null {
  const m = content.match(/(USD|EUR|CNY|GBP|BYN|RUB|\$|€|¥|£|₽)/i);
  if (!m) return null;
  return normalizeCurrency(m[1]);
}

// ─── Regex fallbacks ─────────────────────────────────────────────────────────
function extractTitleFallback(content: string, isHtml: boolean): string | null {
  if (isHtml) {
    const ldMatch = content.match(/"name"\s*:\s*"([^"]{3,})"/);
    if (ldMatch) return ldMatch[1].trim();
    const titleMatch = content.match(/<title[^>]*>([^<]{3,})<\/title>/i);
    if (titleMatch) return titleMatch[1].trim();
    const ogMatch = content.match(/property="og:title"\s+content="([^"]{3,})"/i);
    if (ogMatch) return ogMatch[1].trim();
  } else {
    const mdMatch = content.match(/^#\s+(.+)$/m);
    if (mdMatch) return mdMatch[1].trim();
  }
  return null;
}

function extractPriceFallback(
  content: string,
): { price: number | null; currency: string | null } {
  const m = content.match(
    /(\d[\d\s]*[\.,]\d{1,2}|\d{2,})\s*(USD|EUR|CNY|GBP|BYN|RUB|\$|€|¥|£|₽|руб)/i,
  );
  if (m) {
    const price = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
    return { price: isNaN(price) || price <= 0 ? null : price, currency: normalizeCurrency(m[2]) };
  }
  return { price: null, currency: null };
}

// ─── DeepSeek extraction ─────────────────────────────────────────────────────
interface ExtractedData {
  title: string | null;
  price: number | null;
  currency: string | null;
  category: string | null;
  description: string | null;
  color: string | null;
  brand: string | null;
  marketplace: string | null;
}

async function extractData(content: string, url: string): Promise<ExtractedData> {
  if (!DEEPSEEK_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

  const isHtml = content.trimStart().startsWith("<");
  const contentType = isHtml ? "HTML" : "Markdown";
  const marketplace = marketplaceFromUrl(url);

  const prompt =
    `You are a precise e-commerce product data extractor. Analyze the provided content (which is in ${contentType} format) and extract the following fields. Return only a valid JSON object with these exact keys. Use null for any missing value. Do not include any text outside the JSON.

Fields to extract:
- title: The full product name/title. IMPORTANT: extract the actual product, NOT generic page titles or technical strings. Return null in these cases: (a) content looks like a login page (mentions Alipay, 支付宝, 登录, please log in); (b) content is an "open in app" / deep-link redirect page; (c) title would be a meta-tag name ("viewport", "description", "keywords"); (d) title would be just the website name ("Taobao", "拼多多", "得App", "商品详情", "productDetail"); (e) marketplace homepage / agent service marketing.
- price: The current selling price as a number (without currency symbols, commas, or spaces). Use '.' as decimal separator. Do not convert currencies. If multiple prices are shown, pick the main/default one. If you cannot find a clear product price (only generic prices like shipping fees), return null.
- currency: The ISO 4217 currency code (USD, EUR, CNY, GBP, BYN, RUB, etc.). Infer from symbol if needed: $→USD, €→EUR, ¥→CNY, £→GBP, ₽→RUB. If it cannot be determined, return null.
- category: The product category in Russian, chosen from: "Обувь", "Одежда", "Аксессуары". Determine by analyzing the product name, description, and any breadcrumbs. If none matches, return null.
- description: A concise product description (1-2 sentences) in Russian, summarizing key features. If not available, return null.
- color: The main color(s) in Russian, e.g., "Черный/Белый". If not found, return null.
- brand: The manufacturer brand name, e.g., "Nike", "Adidas". If not found, return null.

${isHtml ? `For HTML: prioritize structured data (JSON-LD <script type="application/ld+json">), meta tags (<meta property="product:price:amount">), and elements with class names like price, product-title, brand.` : `For Markdown: extract information from the structured text, focusing on headings and price patterns.`}

${contentType} content:
${content.substring(0, 8000)}`;

  let dsResponse: Record<string, unknown> | null = null;

  try {
    const dsRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      }),
    });

    if (!dsRes.ok) throw new Error(`DeepSeek ${dsRes.status}`);
    const dsData = await dsRes.json();
    dsResponse = parseAssistantJson(dsData.choices[0].message.content);
  } catch (_e) {
    const titleFb = extractTitleFallback(content, isHtml);
    const { price: priceFb, currency: currFb } = extractPriceFallback(content);
    const currFinal = currFb || extractCurrencyFromContent(content);
    return {
      title: titleFb,
      price: priceFb,
      currency: currFinal,
      category: null,
      description: null,
      color: null,
      brand: null,
      marketplace,
    };
  }

  const parsed = dsResponse!;

  let finalPrice: number | null = null;
  if (typeof parsed.price === "number" && !isNaN(parsed.price) && parsed.price > 0) {
    finalPrice = parsed.price;
  } else if (parsed.price != null && String(parsed.price).trim() !== "") {
    const n = parseFloat(String(parsed.price).replace(/\s/g, "").replace(/,/g, "."));
    if (!isNaN(n) && n > 0) finalPrice = n;
  }

  let finalCurrency = normalizeCurrency(
    typeof parsed.currency === "string" ? parsed.currency : null,
  );
  if (!finalCurrency) finalCurrency = extractCurrencyFromContent(content);

  let title: string | null = null;
  if (typeof parsed.title === "string" && parsed.title.trim()) {
    title = parsed.title.trim();
  } else {
    title = extractTitleFallback(content, isHtml);
  }

  // ─── Санитарный чек: отсекаем homepage Sugargoo / других mirror'ов ─────────
  if (isSugargooHomepageTitle(title) && (finalPrice == null || finalPrice <= 0)) {
    title = null;
  }

  // ─── Блэклист мусорных title (viewport, alipay, login, и т.д.) ─────────────
  if (isGarbageTitle(title)) {
    title = null;
  }

  const strOrNull = (v: unknown): string | null => {
    if (typeof v === "string" && v.trim()) return v.trim();
    return null;
  };

  return {
    title,
    price: finalPrice,
    currency: finalCurrency,
    category: strOrNull(parsed.category),
    description: strOrNull(parsed.description),
    color: strOrNull(parsed.color),
    brand: strOrNull(parsed.brand),
    marketplace,
  };
}

// ─── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const log = (msg: string) => console.log(`[parse-worker] ${msg}`);
  let jobId: string | null = null;

  try {
    const { record } = await req.json();
    const { id, url } = record;
    jobId = id;
    log(`Job ${id}: ${url}`);

    if (!id || !url) throw new Error("Missing id or url");

    // 0. Резолвим короткие ссылки (dw4.co → fast.dewu.com и т.п.)
    let effectiveUrl = url;
    if (isShortLink(url)) {
      effectiveUrl = await resolveRedirect(url);
      if (effectiveUrl !== url) {
        log(`Resolved short link: ${url} → ${effectiveUrl}`);
      }
    }
    const { tier, hostname } = classifyDomain(effectiveUrl);

    // 1а. Apify-роутинг (если токен есть и URL подходит под известный актор).
    //     Покрывает Taobao/Tmall canonical и Temu — самые надёжные кейсы.
    let apifyResult: { data: ApifyExtraction; method: string } | null = null;
    if (tier !== "app_only" && APIFY_TOKEN) {
      try {
        apifyResult = await tryApify(effectiveUrl, hostname, log);
        if (apifyResult) {
          log(`Apify OK (${apifyResult.method}): title="${apifyResult.data.title}" price=${apifyResult.data.price} ${apifyResult.data.currency}`);
        }
      } catch (e) {
        log(`Apify failed: ${(e as Error).message}`);
      }
    }

    // Если Apify дал нормальный результат — пишем сразу, минуя Scrapfly/DeepSeek.
    if (apifyResult && apifyResult.data.title && !isGarbageTitle(apifyResult.data.title)) {
      const ad = apifyResult.data;
      await supabase
        .from("parse_queue")
        .update({
          status: "done",
          price: ad.price,
          title: ad.title,
          currency: ad.currency,
          brand: ad.brand,
          marketplace_name: marketplaceFromUrl(effectiveUrl),
          parse_method: apifyResult.method,
          error_message: null,
          image_url: ad.imageUrl,
        })
        .eq("id", id);
      log(`Completed with status=done method=${apifyResult.method} tier=${tier}`);
      return new Response("ok");
    }

    // 1b. Получаем контент через каскад каналов (по resolved URL)
    let fetchResult: FetchResult | null = null;
    let fetchError: string | null = null;
    try {
      fetchResult = await fetchContent(effectiveUrl, log);
    } catch (e) {
      fetchError = (e as Error).message;
      log(`Fetch failed completely: ${fetchError}`);
    }

    // 2. Если контент так и не получили — manual_required со screenshot-prompt
    if (!fetchResult) {
      const reason =
        tier === "app_only"
          ? "Эта площадка отдаёт данные товара только в приложении. Загрузите скриншот товара — мы извлечём название и цену автоматически."
          : tier === "chinese"
          ? "Площадка с жёсткой anti-bot защитой. Загрузите скриншот товара или введите данные вручную."
          : "Не удалось загрузить страницу. Загрузите скриншот товара или введите данные вручную.";

      await supabase
        .from("parse_queue")
        .update({
          status: "manual_required",
          error_message: reason,
          parse_method: "none",
          marketplace_name: marketplaceFromUrl(url),
        })
        .eq("id", jobId);
      log(`Marked manual_required (tier=${tier})`);
      return new Response("ok");
    }

    // 3. Извлекаем данные через DeepSeek (используем resolved URL для marketplace)
    const extracted = await extractData(fetchResult.content, effectiveUrl);
    log(
      `Extracted via ${fetchResult.method}: title="${extracted.title}", price=${extracted.price} ${extracted.currency}, brand=${extracted.brand}`,
    );

    // 4. Если данных слишком мало — manual_required (с тем что вытянули)
    const hasUsefulData = extracted.title || (extracted.price && extracted.price > 0);
    const finalStatus = hasUsefulData ? "done" : "manual_required";

    const errorMessage = finalStatus === "manual_required"
      ? (tier === "app_only"
          ? "Эта площадка отдаёт данные товара только в приложении. Загрузите скриншот товара — мы извлечём название и цену автоматически."
          : tier === "chinese"
          ? "Не удалось определить цену и название с защищённой китайской площадки. Загрузите скриншот товара или введите данные вручную."
          : "Не удалось определить цену и название. Загрузите скриншот товара или введите данные вручную.")
      : null;

    const { error: updateErr } = await supabase
      .from("parse_queue")
      .update({
        status: finalStatus,
        price: extracted.price,
        title: extracted.title,
        currency: extracted.currency,
        category: extracted.category,
        description: extracted.description,
        color: extracted.color,
        brand: extracted.brand,
        marketplace_name: extracted.marketplace,
        parse_method: fetchResult.method,
        error_message: errorMessage,
      })
      .eq("id", id);

    if (updateErr) throw new Error(`DB update: ${updateErr.message}`);
    log(`Completed with status=${finalStatus} method=${fetchResult.method} tier=${tier}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`Error: ${msg}`);
    if (jobId) {
      await supabase
        .from("parse_queue")
        .update({ status: "error", error_message: msg })
        .eq("id", jobId);
    }
  }

  return new Response("ok");
});
