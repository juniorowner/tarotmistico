import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
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

    let sessionId = "";
    if (req.method === "POST") {
      try {
        const b = (await req.json()) as { session_id?: string };
        sessionId = typeof b.session_id === "string" ? b.session_id : "";
      } catch {
        sessionId = "";
      }
    } else {
      sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
    }

    if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
      return new Response(JSON.stringify({ error: "session_id inválido" }), {
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

    const { data: session, error: sErr } = await admin
      .from("visitor_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (sErr) {
      console.error(sErr);
      return new Response(JSON.stringify({ error: "Erro ao ler sessão" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!session) {
      return new Response(JSON.stringify({ error: "Sessão não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: events, error: eErr } = await admin
      .from("visitor_events")
      .select("id, recorded_at, event_type, payload")
      .eq("session_id", sessionId)
      .order("recorded_at", { ascending: true })
      .limit(5000);

    if (eErr) {
      console.error(eErr);
      return new Response(JSON.stringify({ error: "Erro ao ler eventos" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        session,
        events: events ?? [],
        event_count: (events ?? []).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("admin-visitor-session error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
