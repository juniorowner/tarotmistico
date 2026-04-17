// Cria preferência Checkout Pro Mercado Pago (pacotes de créditos)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Catálogo (espelhar em src/lib/creditPackages.ts) */
const PACKAGES: Record<
  string,
  { credits: number; amountCents: number; title: string }
> = {
  essencial: {
    credits: 5,
    amountCents: 990,
    title: "5 créditos — Interpretações IA",
  },
  popular: {
    credits: 15,
    amountCents: 2490,
    title: "15 créditos — Interpretações IA",
  },
  premium: {
    credits: 40,
    amountCents: 4990,
    title: "40 créditos — Interpretações IA",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";
    const rawSiteUrl = (Deno.env.get("SITE_URL") ?? "").trim().replace(/^['"]|['"]$/g, "");
    const originHeader = (req.headers.get("origin") ?? "").trim();
    const baseSiteUrl = rawSiteUrl || originHeader;
    const siteUrl = baseSiteUrl.replace(/\/$/, "");
    const webhookSecret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!accessToken || !siteUrl || !webhookSecret || !supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({
          error:
            "Pagamentos não configurados. Defina MERCADOPAGO_ACCESS_TOKEN, SITE_URL (ou envie Origin), MERCADOPAGO_WEBHOOK_SECRET e secrets Supabase.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let successUrl = "";
    let failureUrl = "";
    let pendingUrl = "";
    try {
      successUrl = new URL("/creditos?status=success", siteUrl).toString();
      failureUrl = new URL("/creditos?status=failure", siteUrl).toString();
      pendingUrl = new URL("/creditos?status=pending", siteUrl).toString();
    } catch {
      return new Response(
        JSON.stringify({
          error:
            "SITE_URL inválida para retorno do pagamento. Use URL absoluta (ex.: https://seu-dominio.com).",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Não autenticado", code: "AUTH_REQUIRED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const {
      data: { user },
      error: userErr,
    } = await admin.auth.getUser(jwt);

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { packageId?: string };
    const packageId = (body.packageId ?? "").trim();
    const pkg = PACKAGES[packageId];
    if (!pkg) {
      return new Response(JSON.stringify({ error: "Pacote inválido", code: "INVALID_PACKAGE" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unitPrice = pkg.amountCents / 100;

    const { data: order, error: insErr } = await admin
      .from("credit_orders")
      .insert({
        user_id: user.id,
        package_id: packageId,
        credits: pkg.credits,
        amount_cents: pkg.amountCents,
        currency: "BRL",
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !order) {
      console.error("credit_orders insert:", insErr);
      const detail = [
        insErr?.message,
        insErr?.details,
        insErr?.hint,
        insErr?.code ? `code=${insErr.code}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      return new Response(
        JSON.stringify({
          error: detail
            ? `Não foi possível criar o pedido: ${detail}`
            : "Não foi possível criar o pedido",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const orderId = order.id;
    const notificationUrl = `${supabaseUrl.replace(
      /\/$/,
      ""
    )}/functions/v1/mercadopago-webhook?secret=${encodeURIComponent(webhookSecret)}`;

    const preferenceBody = {
      items: [
        {
          title: pkg.title,
          quantity: 1,
          currency_id: "BRL",
          unit_price: unitPrice,
        },
      ],
      payer: user.email ? { email: user.email } : undefined,
      external_reference: orderId,
      metadata: {
        order_id: orderId,
        user_id: user.id,
        package_id: packageId,
        credits: String(pkg.credits),
      },
      notification_url: notificationUrl,
      back_urls: { success: successUrl, failure: failureUrl, pending: pendingUrl },
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceBody),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error("Mercado Pago preference error:", mpData);
      await admin.from("credit_orders").update({ status: "failed" }).eq("id", orderId);
      return new Response(
        JSON.stringify({
          error: mpData?.message || mpData?.error || "Erro Mercado Pago ao criar checkout",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await admin
      .from("credit_orders")
      .update({ mp_preference_id: String(mpData.id ?? "") })
      .eq("id", orderId);

    const initPoint = mpData.init_point ?? mpData.sandbox_init_point;
    if (!initPoint) {
      return new Response(JSON.stringify({ error: "Resposta MP sem URL de checkout" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        init_point: initPoint,
        preference_id: mpData.id,
        order_id: orderId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
