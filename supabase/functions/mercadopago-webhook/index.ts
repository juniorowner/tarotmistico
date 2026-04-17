// Webhook Mercado Pago — aprova pagamento (créditos) e reembolsos (idempotente)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

type Admin = ReturnType<typeof createClient>;

async function findPaidCreditOrder(
  admin: Admin,
  externalRef: string | undefined,
  paymentId: string
): Promise<{ id: string; user_id: string; credits: number; package_id: string } | null> {
  if (externalRef) {
    const { data } = await admin
      .from("credit_orders")
      .select("id, user_id, credits, package_id, status")
      .eq("id", externalRef)
      .maybeSingle();
    if (data && data.status === "paid") {
      return {
        id: data.id,
        user_id: data.user_id,
        credits: data.credits,
        package_id: data.package_id,
      };
    }
    return null;
  }
  const { data } = await admin
    .from("credit_orders")
    .select("id, user_id, credits, package_id, status")
    .eq("mp_payment_id", paymentId)
    .maybeSingle();
  if (data && data.status === "paid") {
    return {
      id: data.id,
      user_id: data.user_id,
      credits: data.credits,
      package_id: data.package_id,
    };
  }
  return null;
}

/** Reembolso total do pacote: desconta até `order.credits` do saldo (não fica negativo). Idempotente. */
async function applyRefundFromMercadoPago(
  admin: Admin,
  order: { id: string; user_id: string; credits: number; package_id: string }
): Promise<{ applied: boolean; reason?: string }> {
  const { data: prof } = await admin.from("profiles").select("credits").eq("id", order.user_id).maybeSingle();
  const cur = prof?.credits ?? 0;
  const deduct = Math.min(order.credits, cur);
  const newBal = cur - deduct;

  if (deduct === 0) {
    const { data: ordUp } = await admin
      .from("credit_orders")
      .update({
        status: "refunded",
        refunded_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "paid")
      .select("id")
      .maybeSingle();
    if (!ordUp) return { applied: false, reason: "not_paid_or_already_refunded" };
    try {
      await admin.from("credit_ledger").insert({
        user_id: order.user_id,
        credits_delta: 0,
        balance_after: cur,
        event_type: "refund_mercadopago",
        summary: `Reembolso Mercado Pago (pedido ${order.package_id}): saldo já era 0 — nenhum crédito a retirar.`,
        ref_table: "credit_orders",
        ref_id: order.id,
        metadata: { requested_credits: order.credits },
      });
    } catch (le) {
      console.error("credit_ledger refund_mp zero:", le);
    }
    return { applied: true };
  }

  const { data: profUp, error: pErr } = await admin
    .from("profiles")
    .update({ credits: newBal })
    .eq("id", order.user_id)
    .eq("credits", cur)
    .select("credits")
    .maybeSingle();

  if (pErr || !profUp) {
    return { applied: false, reason: "profile_race_or_changed" };
  }

  const { data: ordUp } = await admin
    .from("credit_orders")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "paid")
    .select("id")
    .maybeSingle();

  if (!ordUp) {
    await admin.from("profiles").update({ credits: cur }).eq("id", order.user_id).eq("credits", newBal);
    return { applied: false, reason: "order_race" };
  }

  try {
    await admin.from("credit_ledger").insert({
      user_id: order.user_id,
      credits_delta: -deduct,
      balance_after: profUp.credits,
      event_type: "refund_mercadopago",
      summary:
        deduct === order.credits
          ? `Reembolso Mercado Pago: −${deduct} créditos (pacote ${order.package_id}).`
          : `Reembolso Mercado Pago: −${deduct} de ${order.credits} créditos (saldo tinha menos créditos).`,
      ref_table: "credit_orders",
      ref_id: order.id,
      metadata: { requested_credits: order.credits, deducted: deduct },
    });
  } catch (le) {
    console.error("credit_ledger refund_mp:", le);
  }

  return { applied: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") ?? "";
  const expected = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET") ?? "";
  if (!expected || secret !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!accessToken || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Misconfigured" }), { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    let paymentId: string | null = null;

    if (req.method === "GET") {
      const topic = url.searchParams.get("topic") ?? url.searchParams.get("type");
      const id = url.searchParams.get("id") ?? url.searchParams.get("data.id");
      if (topic === "payment" && id) {
        paymentId = id;
      }
    } else if (req.method === "POST") {
      const text = await req.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const data = parsed.data as Record<string, unknown> | undefined;
      const t = parsed.type as string | undefined;
      const action = parsed.action as string | undefined;

      if (t === "payment" || action?.includes("payment")) {
        const id = data?.id;
        paymentId = id != null ? String(id) : null;
      }
      if (!paymentId && parsed.resource != null) {
        paymentId = String(parsed.resource);
      }
    }

    if (!paymentId) {
      return new Response(JSON.stringify({ ok: true, message: "no payment id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payment = await payRes.json();

    if (!payRes.ok) {
      console.error("MP fetch payment:", payment);
      return new Response(JSON.stringify({ ok: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const status = String(payment.status ?? "").toLowerCase();
    const externalRefRaw = payment.external_reference as string | null | undefined;
    const externalRef = externalRefRaw && String(externalRefRaw).trim().length > 0 ? String(externalRefRaw).trim() : "";

    // --- Reembolso / chargeback ---
    if (status === "refunded" || status === "charged_back") {
      const order = await findPaidCreditOrder(admin, externalRef || undefined, paymentId);
      if (!order) {
        return new Response(JSON.stringify({ ok: true, skipped: "no_paid_order_for_refund", status }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const r = await applyRefundFromMercadoPago(admin, order);
      return new Response(JSON.stringify({ ok: true, refund: r }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // --- Aprovação (compra) ---
    if (status !== "approved" || !externalRef) {
      return new Response(JSON.stringify({ ok: true, skipped: status }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: order, error: ordErr } = await admin
      .from("credit_orders")
      .select("id, user_id, credits, status, package_id")
      .eq("id", externalRef)
      .maybeSingle();

    if (ordErr || !order) {
      console.error("order not found:", externalRef, ordErr);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (order.status === "paid") {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (order.status !== "pending") {
      return new Response(JSON.stringify({ ok: true, skipped: order.status }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: updated, error: updErr } = await admin
      .from("credit_orders")
      .update({
        status: "paid",
        mp_payment_id: paymentId,
        paid_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updErr || !updated) {
      return new Response(JSON.stringify({ ok: true, race: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: prof } = await admin.from("profiles").select("credits").eq("id", order.user_id).maybeSingle();

    const newCredits = (prof?.credits ?? 0) + order.credits;
    const { error: credErr } = await admin
      .from("profiles")
      .upsert({ id: order.user_id, credits: newCredits }, { onConflict: "id" });

    if (credErr) {
      console.error("Failed to add credits:", credErr);
      await admin
        .from("credit_orders")
        .update({ status: "pending", mp_payment_id: null, paid_at: null })
        .eq("id", order.id);
      return new Response(JSON.stringify({ error: "credit update failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await admin.from("credit_ledger").insert({
        user_id: order.user_id,
        credits_delta: order.credits,
        balance_after: newCredits,
        event_type: "purchase",
        summary: `Compra: +${order.credits} créditos (pacote ${order.package_id}).`,
        ref_table: "credit_orders",
        ref_id: order.id,
      });
    } catch (le) {
      console.error("credit_ledger purchase:", le);
    }

    return new Response(JSON.stringify({ ok: true, credits_added: order.credits }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
