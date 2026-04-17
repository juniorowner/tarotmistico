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
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";
    if (!supabaseUrl || !serviceKey || !accessToken) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const {
      data: { user },
    } = await admin.auth.getUser(jwt);
    if (!user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pendingOrders } = await admin
      .from("credit_orders")
      .select("id, mp_preference_id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(30);

    let appliedCount = 0;
    let creditsAdded = 0;

    for (const p of pendingOrders ?? []) {
      let first: Record<string, unknown> | null = null;

      const s = await fetch(
        `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=1&external_reference=${encodeURIComponent(
          p.id
        )}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const j = await s.json();
      if (Array.isArray(j?.results) && j.results.length > 0) {
        first = j.results[0] as Record<string, unknown>;
      }

      if (!first && p.mp_preference_id) {
        const mo = await fetch(
          `https://api.mercadopago.com/merchant_orders/search?preference_id=${encodeURIComponent(
            String(p.mp_preference_id)
          )}&limit=1`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const mj = await mo.json();
        const order0 =
          Array.isArray(mj?.elements) && mj.elements.length > 0
            ? (mj.elements[0] as Record<string, unknown>)
            : null;
        const payments = order0?.payments;
        if (Array.isArray(payments) && payments.length > 0) {
          const approved =
            (payments as Array<Record<string, unknown>>).find((x) =>
              ["approved", "authorized"].includes(String(x?.status ?? "").toLowerCase())
            ) ?? (payments[0] as Record<string, unknown>);
          first = approved;
        }
      }

      const mpStatus = String(first?.status ?? "").toLowerCase();
      if (!(mpStatus === "approved" || mpStatus === "authorized")) continue;

      // Transição idempotente: só quem estava pending vira paid.
      const { data: updated } = await admin
        .from("credit_orders")
        .update({
          status: "paid",
          mp_payment_id: first?.id != null ? String(first.id) : null,
          paid_at: new Date().toISOString(),
        })
        .eq("id", p.id)
        .eq("status", "pending")
        .select("id, user_id, credits")
        .maybeSingle();

      if (!updated) continue;

      const { data: prof } = await admin
        .from("profiles")
        .select("credits")
        .eq("id", updated.user_id)
        .maybeSingle();
      const { error: upProfileErr } = await admin
        .from("profiles")
        .upsert(
          { id: updated.user_id, credits: (prof?.credits ?? 0) + (updated.credits ?? 0) },
          { onConflict: "id" }
        );
      if (!upProfileErr) {
        appliedCount += 1;
        creditsAdded += updated.credits ?? 0;
      } else {
        // Rollback de status se falhar crédito.
        await admin
          .from("credit_orders")
          .update({ status: "pending", mp_payment_id: null, paid_at: null })
          .eq("id", updated.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, applied_count: appliedCount, credits_added: creditsAdded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
