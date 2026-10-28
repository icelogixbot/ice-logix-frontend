import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BEPAID_SHOP_ID = Deno.env.get("BEPAID_SHOP_ID") || "MOCK_SHOP_ID";
const BEPAID_SECRET_KEY = Deno.env.get("BEPAID_SECRET_KEY") || "MOCK_SECRET_KEY";
const BEPAID_CHECKOUT_URL = "https://checkout.bepaid.by/api/checkouts";

function generateUUID(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;
  return [...array].map((b, i) =>
    [4, 6, 8, 10].includes(i) ? "-" + b.toString(16).padStart(2, "0") : b.toString(16).padStart(2, "0")
  ).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      sbSecretKey() ?? ""
    );

    const { amount, order_id, user_id, type, description } = await req.json();

    if (!amount || !user_id || !type) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: amount, user_id, type" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const transaction_uuid = generateUUID();
    const webapp_url = Deno.env.get("WEBAPP_URL") ?? "";
    const supabase_url = Deno.env.get("SUPABASE_URL") ?? "";

    const bepaid_payload = {
      checkout: {
        version: "2.1",
        test: true,
        transaction_type: "payment",
        attempts: 1,
        settings: {
          success_url: `${webapp_url}/payment_success?invoice_id=${transaction_uuid}`,
          cancel_url: `${webapp_url}/payment_cancel?invoice_id=${transaction_uuid}`,
          fail_url: `${webapp_url}/payment_fail?invoice_id=${transaction_uuid}`,
          notification_url: `${supabase_url}/functions/v1/bepaid-webhook`,
          language: "ru",
          return_url: `${webapp_url}/payment_return?invoice_id=${transaction_uuid}`,
        },
        order: {
          amount: Math.round(parseFloat(amount) * 100),
          currency: "BYN",
          description: description || `Payment for ${type}`,
          tracking_id: transaction_uuid,
          additional_data: {
            customer_id: user_id,
            invoice_type: type,
            order_id: order_id,
          },
        },
        customer: {
          email: `user_${user_id}@icelogix.by`,
        },
      },
    };

    const isMock = BEPAID_SHOP_ID === "MOCK_SHOP_ID";
    let payment_url: string;

    if (!isMock) {
      const bepaid_response = await fetch(BEPAID_CHECKOUT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic " + btoa(`${BEPAID_SHOP_ID}:${BEPAID_SECRET_KEY}`),
        },
        body: JSON.stringify(bepaid_payload),
      });

      if (!bepaid_response.ok) {
        const error_text = await bepaid_response.text();
        console.error("BePaid API error:", error_text);
        throw new Error(`BePaid API error: ${bepaid_response.status} - ${error_text}`);
      }

      const bepaid_json = await bepaid_response.json();
      payment_url = bepaid_json.checkout.redirect_url;
    } else {
      payment_url = `MOCK_BEPAID_URL/checkout?token=${transaction_uuid}`;
    }

    const { data: invoiceData, error: invoiceError } = await supabaseClient
      .from("invoices")
      .insert({
        order_id: order_id || null,
        user_id: user_id,
        amount: amount,
        currency: "BYN",
        status: "pending",
        external_id: transaction_uuid,
        type: type,
        payment_url: payment_url,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Error inserting invoice:", invoiceError);
      return new Response(
        JSON.stringify({ error: invoiceError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ payment_url: payment_url, invoice_id: invoiceData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Edge Function error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Ключи Supabase: новый формат (sb_secret_ / sb_publishable_), а если его нет, прежний (service_role / anon)
function sbSecretKey(): string | undefined {
  try {
    const key = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"];
    if (key) return key;
  } catch { /* новой переменной нет, берём прежний ключ */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

function sbPublishableKey(): string | undefined {
  try {
    const key = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"];
    if (key) return key;
  } catch { /* новой переменной нет, берём прежний ключ */ }
  return Deno.env.get("SUPABASE_ANON_KEY");
}
