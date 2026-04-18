import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-analytics-ingest",
};

const MAX_EVENTS = 45;
const MAX_BODY_BYTES = 180_000;

type IngestBody = {
  session?: Record<string, unknown>;
  events?: Array<Record<string, unknown>>;
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

  const secret = Deno.env.get("ANALYTICS_INGEST_SECRET") ?? "";
  if (secret) {
    const provided = req.headers.get("x-analytics-ingest") ?? "";
    if (provided !== secret) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const rawLen = Number(req.headers.get("content-length") ?? "0");
  if (rawLen > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "Payload too large" }), {
      status: 413,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: IngestBody;
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const session = body.session;
  const events = Array.isArray(body.events) ? body.events : [];
  if (!session || typeof session !== "object") {
    return new Response(JSON.stringify({ error: "session required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (events.length > MAX_EVENTS) {
    return new Response(JSON.stringify({ error: "too many events" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const id = session.id;
  const visitor_client_id = session.visitor_client_id;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response(JSON.stringify({ error: "invalid session id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (typeof visitor_client_id !== "string" || visitor_client_id.length < 8 || visitor_client_id.length > 120) {
    return new Response(JSON.stringify({ error: "invalid visitor_client_id" }), {
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

  const row: Record<string, unknown> = {
    id,
    visitor_client_id,
    last_seen_at: new Date().toISOString(),
    user_agent: typeof session.user_agent === "string" ? session.user_agent.slice(0, 2000) : null,
    language: typeof session.language === "string" ? session.language.slice(0, 40) : null,
    referrer: typeof session.referrer === "string" ? session.referrer.slice(0, 2000) : null,
    entry_path: typeof session.entry_path === "string" ? session.entry_path.slice(0, 2000) : "/",
    screen_w: numOrNull(session.screen_w),
    screen_h: numOrNull(session.screen_h),
    viewport_w: numOrNull(session.viewport_w),
    viewport_h: numOrNull(session.viewport_h),
    utm: typeof session.utm === "object" && session.utm !== null ? session.utm : {},
    is_authenticated: Boolean(session.is_authenticated),
    auth_user_id:
      typeof session.auth_user_id === "string" && /^[0-9a-f-]{36}$/i.test(session.auth_user_id)
        ? session.auth_user_id
        : null,
    meta: typeof session.meta === "object" && session.meta !== null ? session.meta : {},
    started_at: typeof session.started_at === "string" ? session.started_at : new Date().toISOString(),
  };

  if (typeof session.ended_at === "string") {
    row.ended_at = session.ended_at;
  }

  const { error: upsertErr } = await admin.from("visitor_sessions").upsert(row, { onConflict: "id" });

  if (upsertErr) {
    console.error("visitor_sessions upsert:", upsertErr);
    return new Response(JSON.stringify({ error: "persist failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (events.length > 0) {
    const rows = events.map((ev) => {
      const event_type = typeof ev.event_type === "string" ? ev.event_type.slice(0, 64) : "unknown";
      const recorded_at = typeof ev.recorded_at === "string" ? ev.recorded_at : new Date().toISOString();
      const payload = typeof ev.payload === "object" && ev.payload !== null ? ev.payload : {};
      return {
        session_id: id,
        recorded_at,
        event_type,
        payload,
      };
    });

    const { error: insErr } = await admin.from("visitor_events").insert(rows);
    if (insErr) {
      console.error("visitor_events insert:", insErr);
      return new Response(JSON.stringify({ error: "events persist failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, ingested: events.length }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function numOrNull(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.round(Math.min(99999, Math.max(0, v)));
}
