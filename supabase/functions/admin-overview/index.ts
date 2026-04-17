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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const [usersRes, profilesRes, ordersRes, consultsRes] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("profiles").select("id, credits, first_free_full_consult_used, created_at"),
      admin
        .from("credit_orders")
        .select("id, user_id, package_id, credits, amount_cents, status, created_at, paid_at, mp_payment_id")
        .order("created_at", { ascending: false })
        .limit(1000),
      admin
        .from("reading_consults")
        .select("id, user_id, spread_id, spread_name, used_credit, welcome_free_ai, revoked_at, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    const users = usersRes.data.users ?? [];
    const profiles = profilesRes.data ?? [];
    const orders = ordersRes.data ?? [];
    const consultations = consultsRes.data ?? [];

    const emailByUserId = new Map<string, string>();
    for (const u of users) {
      emailByUserId.set(u.id, u.email ?? "");
    }

    return new Response(
      JSON.stringify({
        users: users.map((u) => ({
          id: u.id,
          email: u.email ?? "",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        })),
        profiles,
        orders: orders.map((o) => ({
          ...o,
          email: emailByUserId.get(o.user_id) ?? "",
        })),
        consultations: consultations.map((c) => ({
          ...c,
          email: emailByUserId.get(c.user_id) ?? "",
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("admin-overview error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
