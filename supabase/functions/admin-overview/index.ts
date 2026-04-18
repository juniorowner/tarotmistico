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

    const [
      usersRes,
      profilesRes,
      ordersRes,
      consultsRes,
      guestLogsRes,
      guestCountRes,
      aiReadingsRes,
      aiReadingsCountRes,
      visitorSessionsRes,
    ] = await Promise.all([
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
      admin
        .from("guest_questions")
        .select("id, spread_name, question, model_used, created_at, interpretation")
        .order("created_at", { ascending: false })
        .limit(200),
      admin.from("guest_questions").select("id", { count: "exact", head: true }),
      admin
        .from("ai_readings")
        .select("id, user_id, question, spread_name, model_used, created_at, ai_interpretation")
        .order("created_at", { ascending: false })
        .limit(300),
      admin.from("ai_readings").select("id", { count: "exact", head: true }),
      admin
        .from("visitor_sessions")
        .select(
          "id, visitor_client_id, started_at, last_seen_at, ended_at, entry_path, referrer, user_agent, language, is_authenticated, auth_user_id, screen_w, screen_h, viewport_w, viewport_h"
        )
        .order("last_seen_at", { ascending: false })
        .limit(150),
    ]);

    const users = usersRes.data.users ?? [];
    const profiles = profilesRes.data ?? [];
    const orders = ordersRes.data ?? [];
    const consultations = consultsRes.data ?? [];

    if (guestLogsRes.error) {
      console.error("admin-overview guest_questions:", guestLogsRes.error);
    }
    if (guestCountRes.error) {
      console.error("admin-overview guest_questions count:", guestCountRes.error);
    }
    if (aiReadingsRes.error) {
      console.error("admin-overview ai_readings:", aiReadingsRes.error);
    }
    if (aiReadingsCountRes.error) {
      console.error("admin-overview ai_readings count:", aiReadingsCountRes.error);
    }
    if (visitorSessionsRes.error) {
      console.error("admin-overview visitor_sessions:", visitorSessionsRes.error);
    }

    const guest_logs = (guestLogsRes.data ?? []).map((row) => {
      const t = row.interpretation ?? "";
      const preview = t.length > 220 ? `${t.slice(0, 220)}…` : t;
      return {
        id: row.id,
        spread_name: row.spread_name,
        question: row.question,
        model_used: row.model_used,
        created_at: row.created_at,
        interpretation_preview: preview,
      };
    });
    const guest_logs_total = guestCountRes.count ?? guest_logs.length;

    const emailByUserId = new Map<string, string>();
    for (const u of users) {
      emailByUserId.set(u.id, u.email ?? "");
    }

    const ai_question_logs = (aiReadingsRes.data ?? []).map((row) => {
      const t = row.ai_interpretation ?? "";
      const preview = t.length > 220 ? `${t.slice(0, 220)}…` : t;
      return {
        id: row.id,
        user_id: row.user_id,
        email: row.user_id ? (emailByUserId.get(row.user_id) ?? "") : "",
        question: row.question,
        spread_name: row.spread_name,
        model_used: row.model_used,
        created_at: row.created_at,
        interpretation_preview: preview,
      };
    });
    const ai_question_logs_total = aiReadingsCountRes.count ?? ai_question_logs.length;

    const visitor_sessions = visitorSessionsRes.error ? [] : (visitorSessionsRes.data ?? []);

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
        guest_logs,
        guest_logs_total,
        ai_question_logs,
        ai_question_logs_total,
        visitor_sessions,
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
