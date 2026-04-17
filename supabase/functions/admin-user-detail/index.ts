import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const adminKey = Deno.env.get("ADMIN_DASHBOARD_KEY") ?? "";
    if (!adminKey) {
      return new Response(JSON.stringify({ error: "ADMIN_DASHBOARD_KEY não configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const providedKey = req.headers.get("x-admin-key") ?? new URL(req.url).searchParams.get("key") ?? "";
    if (!providedKey || providedKey !== adminKey) {
      return new Response(JSON.stringify({ error: "Acesso negado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId = new URL(req.url).searchParams.get("user_id") ?? "";
    if (!userId && req.method === "POST") {
      try {
        const body = (await req.json()) as { user_id?: string };
        userId = body.user_id ?? "";
      } catch {
        // ignore malformed json and keep validation below
      }
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const [userRes, profileRes, ordersRes, consultsRes] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin
        .from("profiles")
        .select("id, credits, first_free_full_consult_used, created_at")
        .eq("id", userId)
        .maybeSingle(),
      admin
        .from("credit_orders")
        .select("id, package_id, credits, amount_cents, status, created_at, paid_at, mp_payment_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(500),
      admin
        .from("reading_consults")
        .select("id, spread_id, spread_name, used_credit, welcome_free_ai, revoked_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    return new Response(
      JSON.stringify({
        user: {
          id: userRes.data.user?.id ?? userId,
          email: userRes.data.user?.email ?? "",
          created_at: userRes.data.user?.created_at ?? null,
          last_sign_in_at: userRes.data.user?.last_sign_in_at ?? null,
        },
        profile: profileRes.data ?? null,
        orders: ordersRes.data ?? [],
        consultations: consultsRes.data ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("admin-user-detail error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
