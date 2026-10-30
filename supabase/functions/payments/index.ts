// ICE LOGIX: платежи (этап Б, ADR-014).
// Клиент (Mini App, токен входа в Authorization):
//   POST { action: 'config' }                                   — какие способы оплаты включены
//   POST { action: 'topup', amount, method, card_id?, save_card? } — пополнение баланса
//   POST { action: 'order', order_id, stage, use_balance, method, card_id?, save_card? } — оплата этапа заказа
//   POST { action: 'bind_card' }                                — привязать карту (страница bePaid)
//   POST { action: 'sandbox_complete', payment_id | bind_id, result } — только BEPAID_MODE=sandbox и только админ
// bePaid: POST /functions/v1/payments/webhook — уведомления о карте и ЕРИП (Basic + подпись Content-Signature).
//
// Деньги зачисляет только payment_settle в базе. Номер карты сюда не попадает: карту вводят на странице bePaid.
// Секреты: BEPAID_MODE (off | sandbox | test | live; по умолчанию off — заявка, подтверждает админ),
//   BEPAID_SHOP_ID, BEPAID_SECRET_KEY, BEPAID_PUBLIC_KEY (base64, для подписи уведомлений),
//   BEPAID_ERIP_SERVICE_NO (если услуг ЕРИП несколько), BEPAID_SKIP_3DS=true (только если bePaid разрешил),
//   BEPAID_BIND_AMOUNT (копейки для привязки, по умолчанию 0), PAYMENTS_RETURN_URL (куда вернуть после оплаты).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const MODE = (Deno.env.get("BEPAID_MODE") || "off").toLowerCase();
const SHOP_ID = Deno.env.get("BEPAID_SHOP_ID") || "";
const SECRET = Deno.env.get("BEPAID_SECRET_KEY") || "";
const PUBLIC_KEY = Deno.env.get("BEPAID_PUBLIC_KEY") || "";
const ERIP_SERVICE_NO = Deno.env.get("BEPAID_ERIP_SERVICE_NO") || "";
const SKIP_3DS = (Deno.env.get("BEPAID_SKIP_3DS") || "") === "true";
const BIND_AMOUNT = Number(Deno.env.get("BEPAID_BIND_AMOUNT") || "0");
const RETURN_URL = Deno.env.get("PAYMENTS_RETURN_URL") || "https://ice-logix-frontend.vercel.app/app.html";
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/payments/webhook`;
const GATEWAY_ON = (MODE === "test" || MODE === "live") && SHOP_ID !== "" && SECRET !== "";

const admin = createClient(SUPABASE_URL, sbSecretKey()!, { auth: { persistSession: false } });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  if (url.pathname.endsWith("/webhook")) return await handleWebhook(req);
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: authData } = await admin.auth.getUser(jwt);
    if (!authData?.user) return json({ ok: false, error: "Войдите в приложение" }, 401);
    const { data: me } = await admin.from("users").select("user_id, role").eq("auth_id", authData.user.id).maybeSingle();
    if (!me) return json({ ok: false, error: "Профиль не найден" }, 401);

    // RPC от имени клиента: в базе сработают его права и проверки (app_uid)
    const asUser = createClient(SUPABASE_URL, sbPublishableKey() || sbSecretKey()!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "config") {
      return json({
        ok: true,
        mode: MODE,
        gateway: GATEWAY_ON || MODE === "sandbox",
        methods: {
          card: GATEWAY_ON || MODE === "sandbox",
          card_token: GATEWAY_ON || MODE === "sandbox",
          erip: GATEWAY_ON || MODE === "sandbox",
          oplati: false, // после договора с Белинвестбанком и их документации
          manual: true,
        },
      });
    }

    if (action === "topup" || action === "order") {
      const method = normMethod(body.method);
      let created: any;
      if (action === "topup") {
        const { data, error } = await asUser.rpc("request_topup", { p_amount: Number(body.amount), p_method: method === "card_token" ? "card" : method });
        if (error) return json({ ok: false, error: error.message }, 400);
        created = data;
      } else {
        const { data, error } = await asUser.rpc("order_pay", {
          p_order_id: body.order_id, p_stage: body.stage === "SECOND" ? "SECOND" : "FIRST",
          p_use_balance: Number(body.use_balance || 0), p_method: method,
        });
        if (error) return json({ ok: false, error: error.message }, 400);
        created = data;
      }
      if (!created?.payment_id) return json({ ok: true, ...created });            // всё оплачено с баланса
      return json(await startPayment(created.payment_id, method, me.user_id, body));
    }

    if (action === "bind_card") {
      if (!GATEWAY_ON && MODE !== "sandbox") {
        return json({ ok: false, error: "Привязка карты заработает после подключения платёжной системы" }, 400);
      }
      const { data: s, error } = await admin.from("card_bind_sessions").insert({ user_id: me.user_id }).select("id").single();
      if (error) return json({ ok: false, error: error.message }, 400);
      if (MODE === "sandbox") return json({ ok: true, sandbox: true, bind_id: s.id });
      const r = await bepaid("https://checkout.bepaid.by/ctp/api/checkouts", {
        checkout: {
          test: MODE !== "live",
          transaction_type: BIND_AMOUNT > 0 ? "payment" : "authorization",
          order: {
            amount: BIND_AMOUNT,
            currency: "BYN",
            description: "Привязка карты ICE LOGIX",
            tracking_id: `bind:${s.id}`,
            additional_data: { contract: ["recurring", "card_on_file"] },
          },
          settings: checkoutSettings(),
        },
      }, true);
      if (!r.ok) return json({ ok: false, error: r.error }, 502);
      await admin.from("card_bind_sessions").update({ checkout_token: r.data?.checkout?.token }).eq("id", s.id);
      return json({ ok: true, redirect_url: r.data?.checkout?.redirect_url, bind_id: s.id });
    }

    if (action === "sandbox_complete") {
      if (MODE !== "sandbox") return json({ ok: false, error: "Песочница выключена" }, 400);
      if (!["owner", "admin"].includes(String(me.role))) return json({ ok: false, error: "Только для администратора" }, 403);
      const success = body.result !== "fail";
      const tracking = body.bind_id ? `bind:${body.bind_id}` : String(body.payment_id || "");
      await processTransaction({
        uid: "sandbox-" + crypto.randomUUID(),
        status: success ? "successful" : "failed",
        tracking_id: tracking,
        message: success ? "Sandbox: оплачено" : "Sandbox: отклонено",
        credit_card: { token: "sandbox_tok_" + crypto.randomUUID().slice(0, 8), last_4: "4242", brand: "visa", exp_month: 12, exp_year: 2030 },
      }, "sandbox");
      return json({ ok: true });
    }

    return json({ ok: false, error: "Неизвестное действие" }, 400);
  } catch (e) {
    console.error("payments error:", e);
    return json({ ok: false, error: "Не получилось провести оплату. Попробуйте ещё раз" }, 500);
  }
});

function normMethod(m: unknown): string {
  const s = String(m || "manual");
  return ["card", "card_token", "erip", "oplati", "manual"].includes(s) ? s : "manual";
}

function checkoutSettings() {
  return {
    return_url: RETURN_URL,
    success_url: RETURN_URL,
    decline_url: RETURN_URL,
    fail_url: RETURN_URL,
    cancel_url: RETURN_URL,
    notification_url: WEBHOOK_URL,
    language: "ru",
  };
}

// Запуск оплаты у провайдера для уже созданной заявки payments (PENDING)
async function startPayment(paymentId: string, method: string, userId: number, body: any) {
  const { data: p } = await admin.from("payments").select("*").eq("id", paymentId).single();
  if (!p) return { ok: false, error: "Платёж не найден" };
  const base = { ok: true, payment_id: p.id, status: "pending", remaining: Number(p.amount) };

  if (method === "manual" || method === "oplati" || (!GATEWAY_ON && MODE !== "sandbox")) {
    // Ручная проверка админом (пока нет договора с платёжкой; «Оплати» — до их документации)
    return { ...base, manual: true };
  }

  const amountMinor = Math.round(Number(p.amount) * 100);
  const description = p.type === "TOPUP" ? "Пополнение баланса ICE LOGIX" : `Оплата заказа ICE LOGIX #${String(p.order_id || "").slice(0, 8)}`;
  const saveCard = Boolean(body.save_card);

  if (MODE === "sandbox") {
    await admin.from("payments").update({ provider: "sandbox", method, metadata: { ...(p.metadata || {}), save_card: saveCard } }).eq("id", p.id);
    return { ...base, sandbox: true };
  }

  if (method === "card") {
    const r = await bepaid("https://checkout.bepaid.by/ctp/api/checkouts", {
      checkout: {
        test: MODE !== "live",
        transaction_type: "payment",
        order: {
          amount: amountMinor,
          currency: "BYN",
          description,
          tracking_id: p.id,
          additional_data: saveCard ? { contract: ["recurring", "card_on_file"] } : {},
        },
        settings: checkoutSettings(),
      },
    }, true);
    if (!r.ok) return { ok: false, error: r.error };
    await admin.from("payments").update({
      provider: "bepaid", method: "card",
      metadata: { ...(p.metadata || {}), save_card: saveCard, checkout_token: r.data?.checkout?.token },
    }).eq("id", p.id);
    return { ...base, redirect_url: r.data?.checkout?.redirect_url };
  }

  if (method === "card_token") {
    const { data: card } = await admin.from("payment_methods").select("id, provider_token_id")
      .eq("id", body.card_id).eq("user_id", userId).eq("status", "ACTIVE").maybeSingle();
    if (!card) return { ok: false, error: "Карта не найдена. Выберите другую или оплатите новой картой" };
    await admin.from("payments").update({ provider: "bepaid", method: "card_token", payment_method_id: card.id }).eq("id", p.id);
    const r = await bepaid("https://gateway.bepaid.by/services/credit_cards/charges", {
      request: {
        amount: amountMinor,
        currency: "BYN",
        description,
        tracking_id: p.id,
        test: MODE !== "live",
        notification_url: WEBHOOK_URL,
        return_url: RETURN_URL,
        credit_card: { token: card.provider_token_id },
        additional_data: { contract: ["card_on_file"], card_on_file: { initiator: "customer" } },
        skip_three_d_secure_verification: SKIP_3DS,
      },
    }, false);
    if (!r.ok) return { ok: false, error: r.error };
    const tx = r.data?.transaction || {};
    if (tx.status === "successful") {
      await processTransaction(tx, "bepaid");
      return { ...base, status: "paid" };
    }
    if (tx.status === "incomplete" && tx.redirect_url) {
      return { ...base, redirect_url: tx.redirect_url, three_ds: true };   // банк просит подтверждение (код из SMS)
    }
    await processTransaction(tx, "bepaid");
    return { ok: false, error: tx.message || "Банк отклонил оплату", payment_id: p.id };
  }

  if (method === "erip") {
    const eripOrderId = Number(String(Date.now()).slice(-12));   // номер заказа в ЕРИП — число
    const r = await bepaid("https://api.bepaid.by/beyag/payments", {
      request: {
        amount: amountMinor,
        currency: "BYN",
        description,
        ip: "127.0.0.1",
        order_id: eripOrderId,
        tracking_id: p.id,
        notification_url: WEBHOOK_URL,
        test: MODE !== "live",
        payment_method: {
          type: "erip",
          account_number: String(eripOrderId),
          ...(ERIP_SERVICE_NO ? { service_no: ERIP_SERVICE_NO } : {}),
        },
      },
    }, false);
    if (!r.ok) return { ok: false, error: r.error };
    const tx = r.data?.transaction || {};
    const erip = { order_id: String(eripOrderId), account_number: tx.erip?.account_number || String(eripOrderId), instruction: tx.erip?.instruction || [] };
    await admin.from("payments").update({
      provider: "bepaid", method: "erip", provider_transaction_id: tx.uid || null,
      metadata: { ...(p.metadata || {}), erip },
    }).eq("id", p.id);
    return { ...base, erip };
  }

  return { ...base, manual: true };
}

// Запрос к bePaid (Basic: id магазина и секретный ключ)
async function bepaid(endpoint: string, payload: unknown, checkoutApi: boolean): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Basic " + btoa(`${SHOP_ID}:${SECRET}`),
        ...(checkoutApi ? { "X-API-Version": "2" } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.errors || data?.response?.status === "error") {
      console.error("bePaid error", res.status, JSON.stringify(data).slice(0, 500));
      return { ok: false, error: "Платёжная система не приняла запрос. Попробуйте позже", data };
    }
    return { ok: true, data };
  } catch (e) {
    console.error("bePaid fetch failed", e);
    return { ok: false, error: "Платёжная система не отвечает. Попробуйте позже" };
  }
}

// ---------------------------------------------------------------------------
// Уведомления bePaid
// ---------------------------------------------------------------------------
async function handleWebhook(req: Request): Promise<Response> {
  const raw = await req.text();
  if (!GATEWAY_ON) return new Response("disabled", { status: 404 });

  // 1) Basic: id магазина и секретный ключ
  const basic = req.headers.get("Authorization") || "";
  if (basic !== "Basic " + btoa(`${SHOP_ID}:${SECRET}`)) {
    console.warn("webhook: bad basic auth");
    return new Response("unauthorized", { status: 401 });
  }
  // 2) Подпись RSA-SHA256 тела (ключ из кабинета bePaid)
  if (PUBLIC_KEY) {
    const ok = await verifySignature(raw, req.headers.get("Content-Signature") || "");
    if (!ok) {
      console.warn("webhook: bad signature");
      return new Response("bad signature", { status: 401 });
    }
  }
  try {
    const body = JSON.parse(raw);
    const tx = body.transaction || body;
    await processTransaction(tx, "bepaid");
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("webhook processing failed", e);
    return new Response("error", { status: 500 });   // bePaid повторит уведомление
  }
}

async function verifySignature(body: string, signatureB64: string): Promise<boolean> {
  try {
    const pem = PUBLIC_KEY.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("spki", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const sig = Uint8Array.from(atob(signatureB64), (c) => c.charCodeAt(0));
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, new TextEncoder().encode(body));
  } catch (_e) {
    return false;
  }
}

// Общая обработка результата: платёж или привязка карты. Повтор безопасен (payment_settle идемпотентна).
async function processTransaction(tx: any, provider: string) {
  const status = String(tx.status || "");
  const tracking = String(tx.tracking_id || "");
  const card = tx.credit_card || {};
  const expiry = card.exp_month && card.exp_year ? `${String(card.exp_month).padStart(2, "0")}/${card.exp_year}` : "";

  // Привязка карты
  if (tracking.startsWith("bind:")) {
    const bindId = tracking.slice(5);
    const { data: s } = await admin.from("card_bind_sessions").select("*").eq("id", bindId).maybeSingle();
    if (!s || s.status !== "PENDING") return;
    if (status === "successful" && card.token) {
      const { data: cardId, error } = await admin.rpc("card_save_from_provider", {
        p_user: s.user_id, p_provider: provider, p_token: card.token, p_last4: card.last_4 || "",
        p_brand: card.brand || "", p_expiry: expiry, p_recurring: true,
      });
      await admin.from("card_bind_sessions").update({
        status: error ? "FAILED" : "DONE", payment_method_id: cardId || null, completed_at: new Date().toISOString(),
      }).eq("id", s.id);
    } else if (["failed", "declined", "expired", "error"].includes(status)) {
      await admin.from("card_bind_sessions").update({ status: "FAILED", completed_at: new Date().toISOString() }).eq("id", s.id);
    }
    return;
  }

  // Платёж: по tracking_id (наш id) или по номеру заказа ЕРИП
  let paymentId = /^[0-9a-f-]{36}$/i.test(tracking) ? tracking : "";
  if (!paymentId && tx.order_id) {
    const { data } = await admin.from("payments").select("id").eq("metadata->erip->>order_id", String(tx.order_id)).maybeSingle();
    paymentId = data?.id || "";
  }
  if (!paymentId) {
    console.warn("webhook: payment not found", tracking, tx.order_id);
    return;
  }
  await admin.from("payment_attempts").insert({
    payment_id: paymentId, provider_transaction_id: tx.uid || null, status: status || "unknown",
    error_message_safe: tx.message ? String(tx.message).slice(0, 300) : null, raw: tx,
    completed_at: new Date().toISOString(),
  });

  if (status === "successful") {
    const { error } = await admin.rpc("payment_settle", { p_payment_id: paymentId, p_provider_tx: tx.uid || null, p_actor: null });
    if (error) throw error;
    // Сохранить карту, если клиент просил («запомнить карту»)
    if (card.token) {
      const { data: p } = await admin.from("payments").select("user_id, metadata").eq("id", paymentId).single();
      if (p?.metadata?.save_card) {
        await admin.rpc("card_save_from_provider", {
          p_user: p.user_id, p_provider: provider, p_token: card.token, p_last4: card.last_4 || "",
          p_brand: card.brand || "", p_expiry: expiry, p_recurring: true,
        });
      }
    }
  } else if (["failed", "declined", "expired", "error"].includes(status)) {
    await admin.rpc("payment_fail", {
      p_payment_id: paymentId, p_status: status === "expired" ? "EXPIRED" : status === "declined" ? "DECLINED" : "FAILED",
      p_reason: tx.message || status, p_provider_tx: tx.uid || null,
    });
  }
}

// Ключи Supabase: новый формат (sb_secret_ / sb_publishable_), а если его нет, прежний (service_role / anon)
function sbSecretKey(): string | undefined {
  try {
    const key = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"];
    if (key) return key;
  } catch (_e) { /* старый формат */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

function sbPublishableKey(): string | undefined {
  try {
    const key = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"];
    if (key) return key;
  } catch (_e) { /* старый формат */ }
  return Deno.env.get("SUPABASE_ANON_KEY");
}
