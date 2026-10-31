import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Сервер пульта поддержки: всё, для чего нужен токен бота поддержки (он хранится только здесь, секрет SUPPORT_BOT_TOKEN).
// Доступ: сессия Supabase из пульта (Authorization: Bearer <access_token>) + роль owner/admin/support в users.
//
// POST JSON { action: "reply", ticket_id, text }                 — ответ клиенту текстом
// POST multipart (action=reply, ticket_id, text?, file)           — ответ с фото или файлом (до 20 МБ)
// POST JSON { action: "retry", message_id }                      — повторить недоставленное сообщение
// POST JSON { action: "close", ticket_id, notify }                — закрыть; notify=true — клиент получит просьбу оценить ответ
// POST JSON { action: "file", message_id }                       — файл вложения (ответ — сами байты)
// POST JSON { action: "link", message_id }                       — ссылка на файл на 10 минут (открыть в браузере)
// GET ?m=<message_id>&exp=<unix>&sig=<hmac>                      — скачать файл по такой ссылке
//
// Сообщение в support_messages пишется здесь, после попытки отправки, с честным статусом delivery.
// Сводку обращения обновляет триггер support_messages_after_insert, карточки в боте — сам бот (card_dirty).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_TEXT = 4000;
const MAX_CAPTION = 1024;
const MAX_FILE = 20 * 1024 * 1024;
const MAX_PHOTO = 10 * 1024 * 1024;
const STAFF_ROLES = ["owner", "admin", "support"];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function sbSecretKey(): string | undefined {
  try {
    const key = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"];
    if (key) return key;
  } catch { /* новой переменной нет, берём прежний ключ */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

type Tg = { ok: boolean; result?: any; description?: string };

async function tg(token: string, method: string, body: Record<string, unknown> | FormData): Promise<Tg> {
  try {
    const isForm = body instanceof FormData;
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: isForm ? undefined : { "Content-Type": "application/json" },
      body: isForm ? body : JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, description: String(e) };
  }
}

function humanError(description = ""): string {
  if (/blocked by the user|bot was blocked/i.test(description)) return "Клиент заблокировал бота поддержки";
  if (/chat not found|user is deactivated/i.test(description)) return "Клиент удалил чат с ботом или аккаунт";
  if (/too big|file is too big/i.test(description)) return "Файл слишком большой для Telegram";
  return "Telegram не принял сообщение";
}

// file_id отправленного вложения из ответа Telegram
function sentFile(result: any): { media_type: string | null; file_id: string | null } {
  if (result?.photo?.length) return { media_type: "photo", file_id: result.photo[result.photo.length - 1].file_id };
  for (const t of ["video", "animation", "voice", "audio", "video_note", "sticker", "document"]) {
    if (result?.[t]?.file_id) return { media_type: t, file_id: result[t].file_id };
  }
  return { media_type: null, file_id: null };
}

const SEND_BY_TYPE: Record<string, [string, string]> = {
  photo: ["sendPhoto", "photo"], video: ["sendVideo", "video"], animation: ["sendAnimation", "animation"],
  voice: ["sendVoice", "voice"], audio: ["sendAudio", "audio"], video_note: ["sendVideoNote", "video_note"],
  sticker: ["sendSticker", "sticker"], document: ["sendDocument", "document"],
};

const LINK_TTL_SEC = 10 * 60;

async function linkSig(token: string, messageId: string, exp: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(`support-file:${token}`),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${messageId}.${exp}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Скачивает вложение из Telegram и отдаёт его как ответ
async function streamFile(admin: any, token: string, messageId: string, download: boolean): Promise<Response> {
  const { data: msg } = await admin.from("support_messages").select("file_id, mime_type, file_name, media_type")
    .eq("id", messageId).maybeSingle();
  if (!msg?.file_id) return json({ ok: false, error: "Вложение не найдено" }, 404);
  const info = await tg(token, "getFile", { file_id: msg.file_id });
  if (!info.ok || !info.result?.file_path) {
    return json({ ok: false, error: "Telegram не отдаёт этот файл (больше 20 МБ или устарел)" }, 404);
  }
  const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${info.result.file_path}`);
  if (!fileRes.ok || !fileRes.body) return json({ ok: false, error: "Не удалось скачать файл" }, 502);
  const name = msg.file_name || String(info.result.file_path).split("/").pop() || "file";
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": msg.mime_type || fileRes.headers.get("Content-Type") || "application/octet-stream",
    "Cache-Control": "private, max-age=86400",
  };
  if (download) headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;
  return new Response(fileRes.body, { headers });
}

const CLOSE_KEYBOARD = (ticketId: string) => ({
  inline_keyboard: [
    [1, 2, 3, 4, 5].map((n) => ({ text: `${n} ★`, callback_data: `rate:${ticketId}:${n}` })),
    [{ text: "Вопрос не решён", callback_data: `reopen:${ticketId}` }],
  ],
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const token = Deno.env.get("SUPPORT_BOT_TOKEN");
    if (!token) return json({ ok: false, error: "Бот поддержки не настроен на сервере" }, 500);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, sbSecretKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // --- Скачивание по подписанной ссылке (браузер, без сессии) ---
    if (req.method === "GET") {
      const url = new URL(req.url);
      const m = url.searchParams.get("m") ?? "";
      const exp = Number(url.searchParams.get("exp") ?? 0);
      const sig = url.searchParams.get("sig") ?? "";
      if (!m || !exp || exp < Date.now() / 1000) return json({ ok: false, error: "Ссылка устарела, откройте файл из пульта заново" }, 410);
      if (sig !== await linkSig(token, m, exp)) return json({ ok: false, error: "Неверная ссылка" }, 403);
      return await streamFile(admin, token, m, true);
    }

    // --- Кто пришёл: сессия Supabase и роль сотрудника ---
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ ok: false, error: "Нужно войти заново" }, 401);
    const { data: authData, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !authData?.user) return json({ ok: false, error: "Сессия истекла, откройте пульт заново" }, 401);
    const { data: me } = await admin.from("users").select("user_id, telegram_id, full_name, role")
      .eq("auth_id", authData.user.id).maybeSingle();
    if (!me || !STAFF_ROLES.includes(me.role)) return json({ ok: false, error: "Нет доступа" }, 403);
    const opId = Number(me.telegram_id || me.user_id);
    const opName = me.full_name || "Оператор";

    // --- Разбор запроса ---
    let body: Record<string, any> = {};
    let file: File | null = null;
    if ((req.headers.get("Content-Type") ?? "").startsWith("multipart/form-data")) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) {
        if (v instanceof File) file = v; else body[k] = v;
      }
    } else {
      body = await req.json().catch(() => ({}));
    }
    const action = String(body.action ?? "");

    const loadTicket = async (id: unknown) => {
      if (typeof id !== "string" || !id) return null;
      const { data } = await admin.from("support_tickets").select("id, number, user_id, status").eq("id", id).maybeSingle();
      return data;
    };

    // --- Файл вложения для просмотра в пульте ---
    if (action === "file") return await streamFile(admin, token, String(body.message_id ?? ""), false);

    if (action === "link") {
      const m = String(body.message_id ?? "");
      if (!m) return json({ ok: false, error: "Не указано сообщение" }, 400);
      const exp = Math.floor(Date.now() / 1000) + LINK_TTL_SEC;
      const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1/support-api`;
      return json({ ok: true, url: `${base}?m=${encodeURIComponent(m)}&exp=${exp}&sig=${await linkSig(token, m, exp)}` });
    }

    // --- Ответ клиенту ---
    if (action === "reply") {
      const ticket = await loadTicket(body.ticket_id);
      if (!ticket) return json({ ok: false, error: "Обращение не найдено" }, 404);
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text && !file) return json({ ok: false, error: "Пустое сообщение" }, 400);
      if (text.length > MAX_TEXT) return json({ ok: false, error: "Сообщение длиннее 4000 символов" }, 400);
      if (file && file.size > MAX_FILE) return json({ ok: false, error: "Файл больше 20 МБ" }, 400);

      let sent: Tg;
      let media = { media_type: null as string | null, file_id: null as string | null };
      let restText = "";
      if (file) {
        const asPhoto = /^image\/(jpeg|png|webp)$/.test(file.type) && file.size <= MAX_PHOTO;
        const caption = text.length <= MAX_CAPTION ? text : "";
        restText = caption ? "" : text;
        const form = new FormData();
        form.append("chat_id", String(ticket.user_id));
        form.append(asPhoto ? "photo" : "document", file, file.name || (asPhoto ? "photo.jpg" : "file"));
        if (caption) form.append("caption", caption);
        sent = await tg(token, asPhoto ? "sendPhoto" : "sendDocument", form);
        if (sent.ok) media = sentFile(sent.result);
        // Длинный текст к файлу уходит отдельным сообщением следом
        if (sent.ok && restText) {
          const second = await tg(token, "sendMessage", { chat_id: ticket.user_id, text: restText });
          if (!second.ok) console.warn("[support-api] текст после файла не ушёл:", second.description);
        }
      } else {
        sent = await tg(token, "sendMessage", { chat_id: ticket.user_id, text });
      }

      if (sent.ok && ticket.status === "closed") {
        await admin.from("support_tickets").update({ status: "in_progress" }).eq("id", ticket.id);
      }
      const row = {
        ticket_id: ticket.id, sender_type: "operator", sender_id: opId, sender_name: opName, text,
        media_type: media.media_type ?? (file ? (file.type.startsWith("image/") ? "photo" : "document") : null),
        file_id: media.file_id, file_name: file?.name ?? null, mime_type: file?.type || null,
        delivery: sent.ok ? "sent" : "failed", tg_message_id: sent.result?.message_id ?? null,
      };
      const { data: saved, error } = await admin.from("support_messages").insert(row).select("*").single();
      if (error) console.error("[support-api] не сохранилось сообщение:", error.message);
      if (!sent.ok) console.warn("[support-api] Telegram:", sent.description);
      return json({ ok: true, delivered: sent.ok, error: sent.ok ? null : humanError(sent.description), message: saved });
    }

    // --- Повтор недоставленного ---
    if (action === "retry") {
      const { data: old } = await admin.from("support_messages").select("*")
        .eq("id", String(body.message_id ?? "")).eq("delivery", "failed").maybeSingle();
      if (!old) return json({ ok: false, error: "Сообщение не найдено или уже доставлено" }, 404);
      const ticket = await loadTicket(old.ticket_id);
      if (!ticket) return json({ ok: false, error: "Обращение не найдено" }, 404);

      let sent: Tg;
      if (old.file_id && old.media_type && SEND_BY_TYPE[old.media_type]) {
        const [method, field] = SEND_BY_TYPE[old.media_type];
        const payload: Record<string, unknown> = { chat_id: ticket.user_id, [field]: old.file_id };
        if (old.text && !["sticker", "video_note"].includes(old.media_type)) payload.caption = old.text.slice(0, MAX_CAPTION);
        sent = await tg(token, method, payload);
      } else if (old.text) {
        sent = await tg(token, "sendMessage", { chat_id: ticket.user_id, text: old.text });
      } else {
        return json({ ok: false, error: "Файл не дошёл до Telegram, отправьте его заново" }, 400);
      }
      if (!sent.ok) return json({ ok: true, delivered: false, error: humanError(sent.description) });

      const { id: _id, created_at: _c, ...rest } = old;
      const { data: saved } = await admin.from("support_messages")
        .insert({ ...rest, sender_id: opId, sender_name: opName, delivery: "sent", tg_message_id: sent.result?.message_id ?? null })
        .select("*").single();
      await admin.from("support_messages").delete().eq("id", old.id);
      return json({ ok: true, delivered: true, message: saved, replaced: old.id });
    }

    // --- Закрытие ---
    if (action === "close") {
      const ticket = await loadTicket(body.ticket_id);
      if (!ticket) return json({ ok: false, error: "Обращение не найдено" }, 404);
      if (ticket.status === "closed") return json({ ok: true, delivered: false, already: true });
      await admin.from("support_tickets").update({ status: "closed" }).eq("id", ticket.id);
      await admin.from("support_messages").insert({
        ticket_id: ticket.id, sender_type: "system", sender_id: opId, sender_name: opName,
        text: `${opName} закрыл обращение${body.notify === false ? " без сообщения клиенту" : ""}`,
      });
      let delivered = false;
      if (body.notify !== false) {
        // Тот же текст и кнопки, что у бота (support_bot.py, close_text / close_keyboard)
        const res = await tg(token, "sendMessage", {
          chat_id: ticket.user_id,
          text: `Обращение #${ticket.number} закрыто. Если вопрос решён, оцените, пожалуйста, ответ:`,
          reply_markup: CLOSE_KEYBOARD(ticket.id),
        });
        delivered = res.ok;
      }
      return json({ ok: true, delivered });
    }

    return json({ ok: false, error: "Неизвестное действие" }, 400);
  } catch (e) {
    console.error("[support-api]", e);
    return json({ ok: false, error: "Внутренняя ошибка сервера" }, 500);
  }
});
