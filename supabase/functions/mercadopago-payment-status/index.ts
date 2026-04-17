import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Admin = ReturnType<typeof createClient>;

/** Liga o pagamento MP ao nosso pedido (external_reference = id do credit_order). */
async function findCreditOrderForPayment(
  admin: Admin,
  paymentId: string,
  externalRef: string
): Promise<{
  id: string;
  user_id: string;
  credits: number;
  package_id: string;
  status: string;
} | null> {
  if (externalRef) {
    const { data } = await admin
      .from("credit_orders")
      .select("id, user_id, credits, package_id, status")
      .eq("id", externalRef)
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await admin
    .from("credit_orders")
    .select("id, user_id, credits, package_id, status")
    .eq("mp_payment_id", paymentId)
    .maybeSingle();
  return data ?? null;
}

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
      return new Response(JSON.stringify({ error: "Supabase service role não configurada." }), {
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

    const body = (await req.json()) as { paymentId?: string | number };
    const paymentId = String(body?.paymentId ?? "").trim();
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "paymentId é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data?.message || "Erro ao consultar pagamento." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = String(data?.status ?? "").toLowerCase();
    const externalRefRaw = data?.external_reference ? String(data.external_reference) : "";
    const externalRef = externalRefRaw.trim();

    const linked = await findCreditOrderForPayment(admin, paymentId, externalRef);
    if (!linked || linked.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Sem permissão para consultar este pagamento.",
          code: "PAYMENT_NOT_OWNED",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reembolso (polling do brick / fallback se webhook falhar)
    if (status === "refunded" || status === "charged_back") {
      let order: { id: string; user_id: string; credits: number; package_id: string } | null = null;
      if (externalRef) {
        const { data: o } = await admin
          .from("credit_orders")
          .select("id, user_id, credits, package_id, status")
          .eq("id", externalRef)
          .maybeSingle();
        if (o?.status === "paid") {
          order = { id: o.id, user_id: o.user_id, credits: o.credits, package_id: o.package_id };
        }
      } else {
        const { data: o } = await admin
          .from("credit_orders")
          .select("id, user_id, credits, package_id, status")
          .eq("mp_payment_id", paymentId)
          .maybeSingle();
        if (o?.status === "paid") {
          order = { id: o.id, user_id: o.user_id, credits: o.credits, package_id: o.package_id };
        }
      }
      if (order) {
        const { data: prof } = await admin.from("profiles").select("credits").eq("id", order.user_id).maybeSingle();
        const cur = prof?.credits ?? 0;
        const deduct = Math.min(order.credits, cur);
        const newBal = cur - deduct;
        if (deduct === 0) {
          const { data: ordUp } = await admin
            .from("credit_orders")
            .update({ status: "refunded", refunded_at: new Date().toISOString() })
            .eq("id", order.id)
            .eq("status", "paid")
            .select("id")
            .maybeSingle();
          if (ordUp) {
            try {
              await admin.from("credit_ledger").insert({
                user_id: order.user_id,
                credits_delta: 0,
                balance_after: cur,
                event_type: "refund_mercadopago",
                summary: `Reembolso Mercado Pago (pedido ${order.package_id}): saldo já era 0.`,
                ref_table: "credit_orders",
                ref_id: order.id,
                metadata: { requested_credits: order.credits },
              });
            } catch (le) {
              console.error("credit_ledger refund_mp zero:", le);
            }
          }
        } else {
          const { data: profUp } = await admin
            .from("profiles")
            .update({ credits: newBal })
            .eq("id", order.user_id)
            .eq("credits", cur)
            .select("credits")
            .maybeSingle();
          if (profUp) {
            const { data: ordUp } = await admin
              .from("credit_orders")
              .update({ status: "refunded", refunded_at: new Date().toISOString() })
              .eq("id", order.id)
              .eq("status", "paid")
              .select("id")
              .maybeSingle();
            if (ordUp) {
              try {
                await admin.from("credit_ledger").insert({
                  user_id: order.user_id,
                  credits_delta: -deduct,
                  balance_after: profUp.credits,
                  event_type: "refund_mercadopago",
                  summary:
                    deduct === order.credits
                      ? `Reembolso Mercado Pago: −${deduct} créditos (pacote ${order.package_id}).`
                      : `Reembolso Mercado Pago: −${deduct} de ${order.credits} créditos.`,
                  ref_table: "credit_orders",
                  ref_id: order.id,
                  metadata: { requested_credits: order.credits, deducted: deduct },
                });
              } catch (le) {
                console.error("credit_ledger refund_mp:", le);
              }
            } else {
              await admin.from("profiles").update({ credits: cur }).eq("id", order.user_id).eq("credits", newBal);
            }
          }
        }
      }
    }

    // Idempotente: se já estiver pago, não recarrega créditos.
    if (status === "approved" && externalRef) {
      const { data: order } = await admin
        .from("credit_orders")
        .select("id, user_id, credits, status, package_id")
        .eq("id", externalRef)
        .maybeSingle();

      if (order && order.status === "pending") {
        const { data: updated } = await admin
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

        if (updated) {
          const { data: prof } = await admin
            .from("profiles")
            .select("credits")
            .eq("id", order.user_id)
            .maybeSingle();
          const newBal = (prof?.credits ?? 0) + order.credits;
          await admin
            .from("profiles")
            .upsert({ id: order.user_id, credits: newBal }, { onConflict: "id" });
          try {
            await admin.from("credit_ledger").insert({
              user_id: order.user_id,
              credits_delta: order.credits,
              balance_after: newBal,
              event_type: "purchase",
              summary: `Compra: +${order.credits} créditos (pacote ${order.package_id}).`,
              ref_table: "credit_orders",
              ref_id: order.id,
            });
          } catch (le) {
            console.error("credit_ledger purchase:", le);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        payment_id: data?.id ?? null,
        status: String(data?.status ?? ""),
        status_detail: data?.status_detail ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("mercadopago-payment-status error:", e);
    return new Response(JSON.stringify({ error: "Erro interno ao consultar pagamento." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
