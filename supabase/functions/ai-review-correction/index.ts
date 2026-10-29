// supabase/functions/ai-review-correction/index.ts
// ICE LOGIX — review-correction v2.0 (правила, без сторонних ИИ)
//
// Перед публикацией отзыва на картах (Яндекс, Google, 2GIS) заменяет слова, из-за которых
// площадки блокируют отзывы: дропшиппинг, рефералка, выплаты, заработок на отзывах.
// Остальной текст не трогаем: города, бренды, сроки и личная история сохраняются как есть.
//
// POST /functions/v1/ai-review-correction
// Body: { "text": "Текст отзыва..." }
// Ответ: { ok, corrected, text }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Фразы целиком (заменяются как есть).
const PHRASES: Array<[RegExp, string]> = [
  [/заработа\p{L}* на (отзыв|реклам)\p{L}*/giu, "сотрудничество по рекламе"],
  [/выплат\p{L}* (по|за) (реклам|отзыв)\p{L}*/giu, "рекламная интеграция"],
  [/выплат\p{L}* (по|за) партн[её]рк\p{L}*/giu, "партнёрские начисления"],
  [/реферальн\p{L}* (ссылк|программ)\p{L}*/giu, "приглашение друзей"],
];

// Слова с падежами: основа → { окончание: замена }. "" — слово без окончания.
// Слово «дроп» не трогаем: в ICE LOGIX так называют подборку новинок.
const WORDS: Array<[string, Record<string, string>]> = [
  ["дропшипп?инг|дропшип|dropshipping|dropship", {
    "": "партнёрский формат", "а": "партнёрского формата", "у": "партнёрскому формату",
    "ом": "партнёрским форматом", "е": "партнёрском формате",
  }],
  ["рефералк|referral", {
    "": "рекомендация", "а": "рекомендация", "и": "рекомендации", "е": "рекомендации",
    "у": "рекомендацию", "ой": "рекомендацией", "ою": "рекомендацией",
  }],
  ["реферал", {
    "": "приглашённый друг", "а": "приглашённого друга", "у": "приглашённому другу",
    "ом": "приглашённым другом", "е": "приглашённом друге", "ы": "приглашённые друзья",
    "ов": "приглашённых друзей", "ам": "приглашённым друзьям", "ами": "приглашёнными друзьями",
    "ах": "приглашённых друзьях",
  }],
  ["партн[её]рк", {
    "а": "партнёрская программа", "и": "партнёрской программы", "е": "партнёрской программе",
    "у": "партнёрскую программу", "ой": "партнёрской программой",
  }],
  ["выплат", {
    "а": "бонус", "ы": "бонусы", "е": "бонусу", "у": "бонус", "ой": "бонусом", "": "бонусов",
    "ам": "бонусам", "ами": "бонусами", "ах": "бонусах",
  }],
  ["кэшб[эе]к|cashback", {
    "": "бонус", "а": "бонуса", "у": "бонусу", "ом": "бонусом", "е": "бонусе",
  }],
];

function matchCase(match: string, repl: string, src: string, offset: number): string {
  const before = src.slice(0, offset).trimEnd();
  const sentenceStart = before === "" || /[.!?\n]$/.test(before);
  const first = match[0];
  const capital = first !== first.toLowerCase() && first === first.toUpperCase();
  return sentenceStart || capital ? repl[0].toUpperCase() + repl.slice(1) : repl;
}

function correctReview(text: string): string {
  let out = text;
  for (const [re, repl] of PHRASES) {
    out = out.replace(re, (m: string, ...a: unknown[]) => matchCase(m, repl, a[a.length - 1] as string, a[a.length - 2] as number));
  }
  for (const [stem, forms] of WORDS) {
    const re = new RegExp(`(?<!\\p{L})(${stem})(\\p{L}*)`, "giu");
    out = out.replace(re, (m: string, _s: string, ending: string, offset: number, src: string) => {
      const repl = forms[ending.toLowerCase()];
      return repl === undefined ? m : matchCase(m, repl, src, offset);
    });
  }
  return out.replace(/[ \t]{2,}/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object" || !payload.text) return json({ error: "Missing text in request body" }, 400);

  const text = String(payload.text).trim();
  const corrected = correctReview(text);
  return json({ ok: true, corrected: corrected !== text, text: corrected });
});
