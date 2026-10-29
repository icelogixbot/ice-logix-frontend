// supabase/functions/pdd-ai/index.ts
// ICE LOGIX — ИИ-помощник движка Pinduoduo.
//
// Вызывает только работник на ноуте (заголовок apikey = секретный ключ Supabase).
// Ключ OpenRouter живёт здесь, в секретах функции, на ноут он не попадает.
//
// Задачи (body.task):
//   "product" — перевод карточки, выжимка отзывов, вердикт «оригинал / реплика»
//   "query"   — описание клиента → китайские поисковые запросы для Pinduoduo
//   "rank"    — оценка и сортировка выдачи поиска под критерии клиента
//   "vision"  — фото → китайский запрос (запасной путь, если поиск по фото в приложении не сработал)

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const TEXT_MODEL = Deno.env.get("OPENROUTER_TEXT_MODEL") || "anthropic/claude-sonnet-4.6";
const FAST_MODEL = Deno.env.get("OPENROUTER_VISION_MODEL") || "google/gemini-2.5-flash";
const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function parseAssistantJson(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.search(/[\[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end === -1) return {};
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return {};
  }
}

// Сначала OpenRouter, при ошибке (нет денег, сбой) — DeepSeek. DeepSeek не видит картинки, поэтому только для текста.
async function llm(model: string, content: unknown, maxTokens: number, timeoutMs: number): Promise<Record<string, unknown>> {
  try {
    return await openRouter(model, content, maxTokens, timeoutMs);
  } catch (e) {
    if (!DEEPSEEK_API_KEY || typeof content !== "string") throw e;
    console.warn("[pdd-ai] OpenRouter недоступен, перехожу на DeepSeek:", (e as Error).message.slice(0, 120));
    return await deepSeek(content, maxTokens, timeoutMs);
  }
}

async function deepSeek(prompt: string, maxTokens: number, timeoutMs: number): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: Math.min(maxTokens, 8000),
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return parseAssistantJson(String(data.choices?.[0]?.message?.content ?? ""));
  } finally {
    clearTimeout(t);
  }
}

async function openRouter(model: string, content: unknown, maxTokens: number, timeoutMs: number): Promise<Record<string, unknown>> {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY не задан");
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://icelogix.by",
        "X-Title": "ICE LOGIX PDD engine",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content }],
        temperature: 0.1,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return parseAssistantJson(String(data.choices?.[0]?.message?.content ?? ""));
  } finally {
    clearTimeout(t);
  }
}

// ─── Правила оценки подлинности (общие для product и rank) ──────────────────
const AUTH_RULES = `Как оценивать подлинность товара на Pinduoduo:
- Сильные признаки оригинала: магазин «官方旗舰店» (официальный флагманский) или «品牌授权»; метка «百亿补贴» (программа субсидий, там продают только оригиналы с гарантией); «正品保障»/«假一赔十» вместе с официальным магазином; цена близка к рыночной цене бренда в Китае.
- Признаки реплики: слова «同款», «平替», «复刻», «高仿», «1:1», «纯原», «公司级», «莆田», «原单», «外贸尾单» в названии; известный бренд по цене в 3–10 раз ниже рынка; обычный магазин без авторизации бренда; бренд не назван прямо, а только намёками.
- Если бренда нет (no-name вещь) — verdict "no_brand", это не реплика.
- Не выдумывай. Если признаков мало — verdict "unknown" и честно напиши, чего не хватает.`;

// ─── task: product ──────────────────────────────────────────────────────────
async function taskProduct(p: Record<string, unknown>) {
  const prompt = `Ты — эксперт по китайским маркетплейсам сервиса ICE LOGIX (доставка из Китая в Беларусь).
Дана карточка товара с Pinduoduo, собранная из приложения. Переведи и проанализируй.

${AUTH_RULES}

Данные (JSON):
${JSON.stringify(p).slice(0, 14000)}

Верни ТОЛЬКО JSON:
{
 "title_ru": "короткое понятное название по-русски, 4–9 слов, бренд латиницей, без рекламы",
 "brand": "бренд латиницей или null",
 "category": "категория по-русски (Кроссовки, Худи, Наушники, ...)",
 "description_ru": "2–3 предложения по сути товара: что это, материал, особенности",
 "specs_ru": [{"k":"Материал","v":"..."}],
 "options_ru": {"исходное китайское название варианта": "перевод"},
 "reviews_ru": [{"i": 0, "text": "перевод отзыва", "sku": "перевод варианта или null"}],
 "review_summary": {"pros": ["что хвалят, до 4 пунктов"], "cons": ["на что жалуются, до 4 пунктов"], "size_advice": "маломерит / в размер / большемерит / null"},
 "authenticity": {"verdict": "original|likely_original|replica|no_brand|unknown", "confidence": 0.0, "reasons": ["коротко, по-русски, 1–4 причины"]},
 "quality_score": 1-10
}
quality_score — общая оценка «стоит ли брать» по отзывам, рейтингу магазина и продажам.`;
  return await llm(TEXT_MODEL, prompt, 3500, 45000);
}

// ─── task: query ────────────────────────────────────────────────────────────
async function taskQuery(p: Record<string, unknown>) {
  const prompt = `Клиент ищет товар на Pinduoduo. Составь поисковые запросы на упрощённом китайском так, как ищут сами китайские покупатели (короткие, 2–6 слов, без лишних слов).

Описание клиента: """${String(p.text || "").slice(0, 600)}"""
Нужен: ${p.authenticity === "original" ? "только оригинал" : p.authenticity === "replica" ? "реплика / аналог подешевле" : "неважно"}

Правила:
- Бренд пиши так, как его пишут на PDD (Nike → 耐克, Adidas → 阿迪达斯, The North Face → 北面, Stone Island → 石头岛, Arc'teryx → 始祖鸟).
- Для оригинала добавь в первый запрос «正品» или «官方旗舰店». Для реплики не используй название бренда напрямую: опиши модель (например «同款 复古 跑鞋»).
- 3 запроса: точный, чуть шире, совсем широкий.

Верни ТОЛЬКО JSON: {"queries_zh": ["...","...","..."], "brand": "латиницей или null", "category": "по-русски", "keywords_ru": "краткий смысл запроса по-русски"}`;
  return await llm(FAST_MODEL, prompt, 400, 15000);
}

// ─── task: rank ─────────────────────────────────────────────────────────────
async function taskRank(p: Record<string, unknown>) {
  const items = Array.isArray(p.items) ? p.items.slice(0, 40) : [];
  const c = (p.criteria || {}) as Record<string, unknown>;
  const prompt = `Ты отбираешь товары с Pinduoduo для клиента ICE LOGIX.

${AUTH_RULES}

Что хочет клиент:
- что ищет: ${String(c.text || c.vision_hint || "по фото")}
- подлинность: ${c.authenticity === "original" ? "только оригинал" : c.authenticity === "replica" ? "реплика подойдёт" : "неважно"}
- бюджет: ${c.budget_cny ? `до ¥${c.budget_cny}` : "не задан"}
- приоритет: ${Number(c.priority ?? 50)}/100 (0 — максимально дёшево, 100 — максимальное качество)

Карточки из выдачи (i — номер):
${JSON.stringify(items)}

Для каждой карточки оцени. Верни ТОЛЬКО JSON:
{"items":[{"i":0,"title_ru":"короткое название по-русски","verdict":"original|likely_original|replica|no_brand|unknown","reason":"одна короткая фраза почему","match":0-10,"quality":0-10,"value":0-10}]}
match — насколько совпадает с тем, что ищет клиент (для поиска по фото считай, что приложение уже подобрало похожие, оцени по названию).
quality — качество по продажам, магазину, меткам. value — соотношение цена/качество.`;
  return await llm(TEXT_MODEL, prompt, 4000, 45000);
}

// ─── task: vision ───────────────────────────────────────────────────────────
async function taskVision(p: Record<string, unknown>) {
  const url = String(p.image_url || "");
  if (!/^https?:\/\//.test(url)) throw new Error("image_url обязателен");
  return await llm(FAST_MODEL, [
    { type: "text", text: `Что за товар на фото? Верни ТОЛЬКО JSON: {"query_zh":"запрос для поиска на Pinduoduo, 2–6 слов на китайском","brand":"латиницей или null","category":"по-русски","description_ru":"одно предложение"}` },
    { type: "image_url", image_url: { url } },
  ], 300, 20000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  const secret = sbSecretKey();
  const presented = req.headers.get("apikey") || "";
  if (!secret || presented !== secret) return json({ ok: false, error: "forbidden" }, 403);

  let body: { task?: string; payload?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }
  const payload = body.payload || {};
  try {
    let data: Record<string, unknown>;
    switch (body.task) {
      case "product": data = await taskProduct(payload); break;
      case "query": data = await taskQuery(payload); break;
      case "rank": data = await taskRank(payload); break;
      case "vision": data = await taskVision(payload); break;
      default: return json({ ok: false, error: "unknown task" }, 400);
    }
    return json({ ok: true, data });
  } catch (e) {
    console.error(`[pdd-ai] ${body.task}:`, (e as Error).message);
    return json({ ok: false, error: (e as Error).message }, 502);
  }
});

// Ключи Supabase: новый формат (sb_secret_), а если его нет, прежний (service_role)
function sbSecretKey(): string | undefined {
  try {
    const key = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"];
    if (key) return key;
  } catch { /* старый формат */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}
