// supabase/functions/bepaid-checkout/index.ts
// ЗАГЛУШКА: оплата картой через bePaid пока недоступна (приём платежей идёт через функцию payments).
// Прежний код сохранён в _archive/supabase-functions/bepaid-checkout/index.ts.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({ error: "Оплата картой пока недоступна" }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
