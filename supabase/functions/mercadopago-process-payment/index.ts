// Proxy seguro para POST /v1/payments (Brick) — exige sessão e que o pedido seja do utilizador.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Não autenticado.", code: "AUTH_REQUIRED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "MERCADOPAGO_ACCESS_TOKEN ausente." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Supabase não configurado." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const {
      data: { user },
      error: userErr,
    } = await admin.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida.", code: "AUTH_INVALID" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as Record<string, unknown>;
    const creditOrderRaw = payload.credit_order_id;
    const creditOrderId =
      typeof creditOrderRaw === "string" && creditOrderRaw.trim().length > 0
        ? creditOrderRaw.trim()
        : null;
    if (!creditOrderId) {
      return new Response(
        JSON.stringify({
          error: "Identificador do pedido em falta.",
          code: "CREDIT_ORDER_REQUIRED",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: order, error: ordErr } = await admin
      .from("credit_orders")
      .select("id, user_id, status")
      .eq("id", creditOrderId)
      .maybeSingle();

    if (ordErr || !order || order.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Pedido inválido.", code: "ORDER_FORBIDDEN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (order.status !== "pending") {
      return new Response(
        JSON.stringify({
          error: "Este pedido já não está pendente.",
          code: "ORDER_NOT_PENDING",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { credit_order_id: _drop, ...rest } = payload;
    const mpBody: Record<string, unknown> = { ...rest };
    mpBody.external_reference = creditOrderId;

    const idempotencyKey = crypto.randomUUID();
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(mpBody),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      const msg = mpData?.message || mpData?.error || "Erro ao processar pagamento no Mercado Pago.";
      return new Response(JSON.stringify({ error: msg, details: mpData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        status: String(mpData?.status ?? ""),
        payment_id: mpData?.id ?? null,
        status_detail: mpData?.status_detail ?? null,
        qr_code:
          mpData?.point_of_interaction?.transaction_data?.qr_code ??
          null,
        qr_code_base64:
          mpData?.point_of_interaction?.transaction_data?.qr_code_base64 ??
          null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("mercadopago-process-payment error:", e);
    return new Response(JSON.stringify({ error: "Erro interno no processamento de pagamento." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
