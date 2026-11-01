// supabase/functions/assistant-chat/index.ts
// ICE LOGIX — ассистент поиска Mini App (наша ИИ, без сторонних сервисов).
//
// Прокси к ICE LOGIX AI `/chat` (ice-logix-doc-ai): ключ доступа живёт здесь, в браузер не попадает (ADR-010).
// Пускает только вошедшего пользователя, режет длину вопроса и истории, ограничивает частоту
// (сервер ИИ слабый: 1 ядро).
//
// POST /functions/v1/assistant-chat
// Body: { "query": "...", "history": [{ "role": "user|assistant", "content": "..." }] }
// Ответ: { ok, mode: "llm"|"facts", answer, sources }
//
// Секреты: SUPABASE_URL, SUPABASE_ANON_KEY (стандартные), DOC_AI_URL, DOC_AI_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DOC_AI_URL = (Deno.env.get("DOC_AI_URL") || "https://80.94.235.37").replace(/\/$/, "");
const DOC_AI_KEY = Deno.env.get("DOC_AI_KEY") || "";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Не чаще 6 вопросов в минуту с одного пользователя (в памяти экземпляра функции)
const hits = new Map<string, number[]>();
function tooOften(uid: string): boolean {
  const now = Date.now();
  const list = (hits.get(uid) || []).filter((t) => now - t < 60_000);
  if (list.length >= 6) { hits.set(uid, list); return true; }
  list.push(now);
  hits.set(uid, list);
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Только POST" }, 405);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: auth } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
  const uid = auth?.user?.id;
  if (!uid) return json({ ok: false, error: "Войдите в приложение" }, 401);
  if (tooOften(uid)) return json({ ok: false, error: "Слишком часто. Подождите минуту" }, 429);

  let body: { query?: unknown; history?: unknown };
  try { body = await req.json(); } catch { return json({ ok: false, error: "Неверный запрос" }, 400); }

  const query = typeof body.query === "string" ? body.query.trim().slice(0, 300) : "";
  if (!query) return json({ ok: false, error: "Пустой вопрос" }, 400);
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-6)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 500) }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  try {
    const res = await fetch(`${DOC_AI_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Ice-Ai-Key": DOC_AI_KEY },
      body: JSON.stringify({ query, history }),
      signal: controller.signal,
    });
    if (!res.ok) return json({ ok: false, error: `ИИ недоступен (${res.status})` }, 502);
    return json(await res.json());
  } catch (_e) {
    return json({ ok: false, error: "ИИ сейчас не отвечает" }, 504);
  } finally {
    clearTimeout(timer);
  }
});
