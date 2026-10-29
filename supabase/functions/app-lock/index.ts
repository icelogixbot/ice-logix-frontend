// Код-пароль приложения и вход по Face ID / отпечатку (ADR-013).
// Все проверки только здесь: браузер получает «да / нет», отпечатки кода и ключей наружу не уходят.
// Пользователь определяется по токену входа (auth.users.id), Telegram ID для кода сброса — из подписи Telegram.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_FAILS = 5;              // ошибок кода подряд до блокировки
const RESET_TTL_MIN = 10;         // сколько живёт код сброса
const RESET_MAX_ATTEMPTS = 5;     // попыток ввести код сброса
const RESET_MAX_PER_HOUR = 3;     // запросов кода сброса в час
const MAX_BIO_DEVICES = 5;
const PIN_ITER = 300_000;         // PBKDF2-SHA256; хранится в строке, можно поднять позже
const INIT_DATA_MAX_AGE = 24 * 3600;

const enc = new TextEncoder();
const toHex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h: string) => new Uint8Array((h.match(/.{2}/g) || []).map((x) => parseInt(x, 16)));
const randomHex = (n: number) => toHex(crypto.getRandomValues(new Uint8Array(n)));

function sameString(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

function pepper(): Uint8Array {
  const p = Deno.env.get("APP_LOCK_PEPPER");
  if (!p || p.length < 32) throw new Error("APP_LOCK_PEPPER is not configured");
  return enc.encode(p);
}

// Отпечаток кода: сначала HMAC с секретом сервера (без него утёкшую таблицу не перебрать), потом PBKDF2 с солью
async function pinHash(pin: string, saltHex: string, iter: number): Promise<string> {
  const peppered = await hmac(pepper(), "pin:" + pin);
  const key = await crypto.subtle.importKey("raw", peppered, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations: iter }, key, 256);
  return toHex(bits);
}

const secretHash = async (purpose: string, value: string) => toHex(await hmac(pepper(), purpose + ":" + value));

// Слишком простые коды: 1111, 1234, 4321, 0123…
function weakPin(pin: string): boolean {
  if (/^(\d)\1{3}$/.test(pin)) return true;
  const d = pin.split("").map(Number);
  const up = d.every((v, i) => i === 0 || v === (d[i - 1] + 1) % 10);
  const down = d.every((v, i) => i === 0 || v === (d[i - 1] + 9) % 10);
  return up || down || pin === "1212" || pin === "2580";
}

async function verifyInitData(initData: string, botToken: string): Promise<{ id: number } | null> {
  if (!initData || typeof initData !== "string") return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash") || "";
  params.delete("hash");
  const checkString = Array.from(params.keys()).sort().map((k) => `${k}=${params.get(k)}`).join("\n");
  const secret = await hmac(enc.encode("WebAppData"), botToken);
  const sign = toHex(await hmac(secret, checkString));
  if (!sameString(sign, hash)) return null;
  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE) return null;
  try {
    const user = JSON.parse(params.get("user") || "{}");
    return user && user.id ? { id: Number(user.id) } : null;
  } catch {
    return null;
  }
}

function sbSecretKey(): string | undefined {
  try {
    const key = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"];
    if (key) return key;
  } catch { /* новой переменной нет, берём прежний ключ */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type LockRow = {
  auth_id: string; user_id: number | null; telegram_id: number; pin_hash: string; pin_salt: string; pin_iter: number;
  failed_attempts: number; blocked_at: string | null; bio_devices: { device_id: string; token_hash: string; type?: string; added_at: string }[];
  reset_code_hash: string | null; reset_expires_at: string | null; reset_attempts: number;
};

// Проверка кода с атомарным «забором» попытки: параллельные запросы не дают больше MAX_FAILS проверок
async function checkPin(db: SupabaseClient, row: LockRow, pin: unknown): Promise<{ ok: boolean; blocked?: boolean; left?: number }> {
  if (row.blocked_at) return { ok: false, blocked: true };
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) return { ok: false, left: Math.max(0, MAX_FAILS - row.failed_attempts) };
  const { data: n, error } = await db.rpc("app_lock_take_attempt", { p_auth: row.auth_id, p_kind: "pin" });
  if (error) throw error;
  if (n > MAX_FAILS) {
    await db.from("app_locks").update({ blocked_at: new Date().toISOString() }).eq("auth_id", row.auth_id);
    return { ok: false, blocked: true };
  }
  const good = sameString(await pinHash(pin, row.pin_salt, row.pin_iter), row.pin_hash);
  if (good) {
    await db.from("app_locks").update({ failed_attempts: 0, updated_at: new Date().toISOString() }).eq("auth_id", row.auth_id);
    return { ok: true };
  }
  if (n >= MAX_FAILS) {
    await db.from("app_locks").update({ blocked_at: new Date().toISOString() }).eq("auth_id", row.auth_id);
    return { ok: false, blocked: true };
  }
  return { ok: false, left: MAX_FAILS - n };
}

async function newPinFields(pin: string) {
  const salt = randomHex(16);
  return { pin_hash: await pinHash(pin, salt, PIN_ITER), pin_salt: salt, pin_iter: PIN_ITER };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, sbSecretKey()!, { auth: { persistSession: false } });
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: authData } = await db.auth.getUser(jwt);
    const user = authData?.user;
    if (!user) return json({ ok: false, error: "auth" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const { data: row } = await db.from("app_locks").select("*").eq("auth_id", user.id).maybeSingle() as { data: LockRow | null };
    const now = new Date();

    if (action === "status") {
      const deviceId = String(body.device_id || "");
      return json({
        ok: true,
        enabled: !!row,
        blocked: !!row?.blocked_at,
        bio_device: !!(row && deviceId && row.bio_devices.some((d) => d.device_id === deviceId)),
      });
    }

    if (action === "setup") {
      if (row) return json({ ok: false, error: "exists" });
      const pin = String(body.pin || "");
      if (!/^\d{4}$/.test(pin)) return json({ ok: false, error: "format" });
      if (weakPin(pin)) return json({ ok: false, error: "weak" });
      const tg = await verifyInitData(String(body.init_data || ""), Deno.env.get("BOT_TOKEN") || "");
      if (!tg) return json({ ok: false, error: "telegram" });
      // Telegram, из которого включают код, должен быть тем же, что привязан к аккаунту
      const metaTg = Number(user.user_metadata?.telegram_id || 0);
      if (metaTg !== tg.id && user.email !== `tg_${tg.id}@icelogix.by`) return json({ ok: false, error: "telegram_mismatch" });
      const { data: profile } = await db.from("users").select("user_id").eq("auth_id", user.id).maybeSingle();
      const { error } = await db.from("app_locks").insert({
        auth_id: user.id, user_id: profile?.user_id ?? null, telegram_id: tg.id, ...(await newPinFields(pin)),
      });
      if (error) throw error;
      return json({ ok: true });
    }

    if (!row) return json({ ok: false, error: "not_enabled" });

    if (action === "verify") {
      return json(await checkPin(db, row, body.pin));
    }

    if (action === "change") {
      const newPin = String(body.new_pin || "");
      if (!/^\d{4}$/.test(newPin)) return json({ ok: false, error: "format" });
      if (weakPin(newPin)) return json({ ok: false, error: "weak" });
      const res = await checkPin(db, row, body.pin);
      if (!res.ok) return json(res);
      await db.from("app_locks").update({ ...(await newPinFields(newPin)), updated_at: now.toISOString() }).eq("auth_id", user.id);
      return json({ ok: true });
    }

    if (action === "disable") {
      const res = await checkPin(db, row, body.pin);
      if (!res.ok) return json(res);
      await db.from("app_locks").delete().eq("auth_id", user.id);
      return json({ ok: true });
    }

    if (action === "bio_enable") {
      const deviceId = String(body.device_id || "").slice(0, 128);
      if (!deviceId) return json({ ok: false, error: "device" });
      const res = await checkPin(db, row, body.pin);
      if (!res.ok) return json(res);
      const token = randomHex(32);
      const devices = row.bio_devices.filter((d) => d.device_id !== deviceId);
      devices.push({ device_id: deviceId, token_hash: await secretHash("bio", token), type: String(body.type || "").slice(0, 16), added_at: now.toISOString() });
      await db.from("app_locks").update({ bio_devices: devices.slice(-MAX_BIO_DEVICES), updated_at: now.toISOString() }).eq("auth_id", user.id);
      return json({ ok: true, token });
    }

    if (action === "bio_verify") {
      if (row.blocked_at) return json({ ok: false, blocked: true });
      const deviceId = String(body.device_id || "");
      const dev = row.bio_devices.find((d) => d.device_id === deviceId);
      if (!dev) return json({ ok: false, error: "bio_unknown" });
      const { data: n, error } = await db.rpc("app_lock_take_attempt", { p_auth: row.auth_id, p_kind: "pin" });
      if (error) throw error;
      if (n > MAX_FAILS) return json({ ok: false, blocked: true });
      if (sameString(await secretHash("bio", String(body.token || "")), dev.token_hash)) {
        await db.from("app_locks").update({ failed_attempts: 0, updated_at: now.toISOString() }).eq("auth_id", user.id);
        return json({ ok: true });
      }
      if (n >= MAX_FAILS) {
        await db.from("app_locks").update({ blocked_at: now.toISOString() }).eq("auth_id", user.id);
        return json({ ok: false, blocked: true });
      }
      return json({ ok: false, error: "bio_failed", left: MAX_FAILS - n });
    }

    if (action === "bio_disable") {
      const deviceId = String(body.device_id || "");
      await db.from("app_locks").update({ bio_devices: row.bio_devices.filter((d) => d.device_id !== deviceId), updated_at: now.toISOString() }).eq("auth_id", user.id);
      return json({ ok: true });
    }

    if (action === "reset_request") {
      const { data: n, error } = await db.rpc("app_lock_take_reset_request", { p_auth: row.auth_id });
      if (error) throw error;
      if (n > RESET_MAX_PER_HOUR) return json({ ok: false, error: "too_many" });
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
      await db.from("app_locks").update({
        reset_code_hash: await secretHash("reset", code),
        reset_expires_at: new Date(now.getTime() + RESET_TTL_MIN * 60_000).toISOString(),
        reset_attempts: 0,
        updated_at: now.toISOString(),
      }).eq("auth_id", user.id);
      const { error: qErr } = await db.from("notification_queue").insert({
        user_id: row.telegram_id, kind: "security", payload: { purpose: "pin_reset", code, ttl_min: RESET_TTL_MIN },
      });
      if (qErr) throw qErr;
      return json({ ok: true, ttl_min: RESET_TTL_MIN });
    }

    if (action === "reset_confirm") {
      const code = String(body.code || "");
      const newPin = String(body.new_pin || "");
      if (!row.reset_code_hash || !row.reset_expires_at || new Date(row.reset_expires_at) < now) return json({ ok: false, error: "code_expired" });
      if (!/^\d{4}$/.test(newPin)) return json({ ok: false, error: "format" });
      if (weakPin(newPin)) return json({ ok: false, error: "weak" });
      const { data: n, error } = await db.rpc("app_lock_take_attempt", { p_auth: row.auth_id, p_kind: "reset" });
      if (error) throw error;
      if (n > RESET_MAX_ATTEMPTS) {
        await db.from("app_locks").update({ reset_code_hash: null, reset_expires_at: null }).eq("auth_id", user.id);
        return json({ ok: false, error: "code_expired" });
      }
      if (!/^\d{6}$/.test(code) || !sameString(await secretHash("reset", code), row.reset_code_hash)) {
        if (n >= RESET_MAX_ATTEMPTS) await db.from("app_locks").update({ reset_code_hash: null, reset_expires_at: null }).eq("auth_id", user.id);
        return json({ ok: false, error: "code_wrong", left: Math.max(0, RESET_MAX_ATTEMPTS - n) });
      }
      // Новый код; блокировка снята; ключи биометрии сброшены — их нужно включить заново
      await db.from("app_locks").update({
        ...(await newPinFields(newPin)),
        failed_attempts: 0, blocked_at: null, bio_devices: [],
        reset_code_hash: null, reset_expires_at: null, reset_attempts: 0, updated_at: now.toISOString(),
      }).eq("auth_id", user.id);
      return json({ ok: true });
    }

    return json({ ok: false, error: "action" }, 400);
  } catch (e) {
    console.error("app-lock error:", e instanceof Error ? e.message : e);
    return json({ ok: false, error: "server" }, 500);
  }
});
