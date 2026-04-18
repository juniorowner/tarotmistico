// Quota de consulta grátis por conta (vitalícia) + saldo de créditos
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FREE_CONSULTS_PER_ACCOUNT = 1;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Não autenticado", code: "AUTH_REQUIRED" }), {
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
    const {
      data: { user },
      error: userErr,
    } = await admin.auth.getUser(jwt);

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida", code: "AUTH_INVALID" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count: consultsLifetime, error: countErr } = await admin
      .from("reading_consults")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("revoked_at", null);

    if (countErr) {
      console.error("ai-quota count reading_consults:", countErr);
    }

    const n = consultsLifetime ?? 0;
    const freeRemaining = Math.max(0, FREE_CONSULTS_PER_ACCOUNT - n);

    const { data: profile } = await admin
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        free_per_account: FREE_CONSULTS_PER_ACCOUNT,
        consults_completed: n,
        free_remaining_today: freeRemaining,
        credits_balance: profile?.credits ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
