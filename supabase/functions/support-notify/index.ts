import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Отправка ответов оператора поддержки клиенту в Telegram.
// Токен бота поддержки хранится только здесь (секрет SUPPORT_BOT_TOKEN), в браузер он не попадает.
//
// POST { initData, action: "reply" | "close", ticket_id, text? }
//  - initData: подписанные данные Telegram WebApp (проверяются на сервере);
//  - оператор должен быть в списке OPERATOR_TELEGRAM_IDS (по умолчанию 6107097715);
//  - получатель берётся из таблицы support_tickets по ticket_id, а не из запроса.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TEXT_LENGTH = 4000;
const INIT_DATA_MAX_AGE_SEC = 7 * 24 * 60 * 60;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function operatorIds(): number[] {
  const raw = Deno.env.get("OPERATOR_TELEGRAM_IDS") ?? "6107097715";
  return raw.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
}

async function hmac(key: BufferSource, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
}

// Возвращает пользователя Telegram, если подпись initData верна для данного токена бота
async function verifyInitData(initData: string, botToken: string): Promise<{ id: number } | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE_SEC) return null;

  const dataCheckString = Array.from(params.keys()).sort().map((k) => `${k}=${params.get(k)}`).join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), botToken);
  const signature = await hmac(secret, dataCheckString);
  const hex = Array.from(signature).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex !== hash) return null;

  try {
    const user = JSON.parse(params.get("user") ?? "{}");
    return user?.id ? { id: Number(user.id) } : null;
  } catch {
    return null;
  }
}

async function sendTelegram(botToken: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.warn("[support-notify] Telegram ответил", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.warn("[support-notify] Telegram недоступен:", String(e));
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const supportToken = Deno.env.get("SUPPORT_BOT_TOKEN");
    if (!supportToken) return json({ ok: false, error: "SUPPORT_BOT_TOKEN не настроен на сервере" }, 500);

    const { initData, action, ticket_id, text } = await req.json().catch(() => ({}));
    if (typeof initData !== "string" || !initData) return json({ ok: false, error: "Нет данных Telegram" }, 401);

    // Окно поддержки может быть открыто через бота поддержки или через основного бота
    let user = await verifyInitData(initData, supportToken);
    const mainToken = Deno.env.get("BOT_TOKEN");
    if (!user && mainToken) user = await verifyInitData(initData, mainToken);
    if (!user) return json({ ok: false, error: "Неверная подпись Telegram" }, 401);
    if (!operatorIds().includes(user.id)) return json({ ok: false, error: "Нет доступа" }, 403);

    if (action !== "reply" && action !== "close") return json({ ok: false, error: "Неизвестное действие" }, 400);
    if (typeof ticket_id !== "string" || !ticket_id) return json({ ok: false, error: "Не указан тикет" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, sbSecretKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: ticket, error } = await admin.from("support_tickets").select("user_id").eq("id", ticket_id).maybeSingle();
    if (error || !ticket?.user_id) return json({ ok: false, error: "Тикет не найден" }, 404);

    let payload: Record<string, unknown>;
    if (action === "reply") {
      const body = typeof text === "string" ? text.trim() : "";
      if (!body) return json({ ok: false, error: "Пустое сообщение" }, 400);
      if (body.length > MAX_TEXT_LENGTH) return json({ ok: false, error: "Сообщение слишком длинное" }, 400);
      payload = {
        chat_id: ticket.user_id,
        text: `🎧 <b>Служба заботы ICE LOGIX:</b>\n\n${body}`,
        parse_mode: "HTML",
      };
    } else {
      payload = {
        chat_id: ticket.user_id,
        text:
          "✅ <b>Ваш вопрос решен!</b>\n\nСпасибо, что обратились в службу заботы ICE LOGIX ❄️\nЕсли у вас возникнет новый вопрос — просто нажмите кнопку <b>«💬 Задать вопрос»</b> ниже.",
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [[{ text: "💬 Задать вопрос" }]],
          resize_keyboard: true,
          is_persistent: true,
        },
      };
    }

    const delivered = await sendTelegram(supportToken, payload);
    return json({ ok: true, delivered });
  } catch (e) {
    console.error("[support-notify]", e);
    return json({ ok: false, error: "Внутренняя ошибка" }, 500);
  }
});

// Ключ Supabase: новый формат (sb_secret_), а если его нет, прежний (service_role)
function sbSecretKey(): string | undefined {
  try {
    const key = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"];
    if (key) return key;
  } catch { /* новой переменной нет, берём прежний ключ */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}
