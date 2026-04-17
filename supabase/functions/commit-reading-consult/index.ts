// Debita quota / crédito quando a consulta (tiragem) fica completa — antes da IA.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FREE_CONSULTS_PER_DAY = 1;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function startOfUtcDayIso(): string {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  ).toISOString();
}

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
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "Inicie sessão para consultar.", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Sessão inválida.", code: "AUTH_INVALID" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as {
      dedupeKey?: string;
      spreadId?: string;
      spreadName?: string;
      cards?: unknown[];
    };

    const dedupeKey = (body.dedupeKey ?? "").trim();
    const spreadId = (body.spreadId ?? "").trim();
    const spreadName = (body.spreadName ?? "").trim();
    const cards = Array.isArray(body.cards) ? body.cards : [];

    if (!dedupeKey || !spreadId || !spreadName || cards.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Campos obrigatórios: dedupeKey, spreadId, spreadName, cards.",
          code: "INVALID_BODY",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existing } = await admin
      .from("reading_consults")
      .select("id, used_credit, welcome_free_ai")
      .eq("user_id", user.id)
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();

    if (existing) {
      const dayStart = startOfUtcDayIso();
      // Inclui revogadas: senão cada falha da IA “devolvia” uma vaga e dava consultas grátis ilimitadas no mesmo dia.
      const { count: usedToday } = await admin
        .from("reading_consults")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", dayStart);
      const n = usedToday ?? 0;
      const freeRemaining = Math.max(0, FREE_CONSULTS_PER_DAY - n);
      const { data: prof } = await admin
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .maybeSingle();
      return new Response(
        JSON.stringify({
          consultation_id: existing.id,
          used_credit: existing.used_credit,
          welcome_free_ai: existing.welcome_free_ai ?? false,
          credits_balance: prof?.credits ?? 0,
          free_remaining_today: freeRemaining,
          duplicate: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dayStart = startOfUtcDayIso();
    const { count: usedBefore, error: countErr } = await admin
      .from("reading_consults")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", dayStart);

    if (countErr) {
      console.error("count reading_consults:", countErr);
    }

    const n = usedBefore ?? 0;
    let usedCredit = false;
    const welcomeFreeAi = false;

    const { data: profileBefore, error: profBeforeErr } = await admin
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (profBeforeErr || !profileBefore) {
      return new Response(
        JSON.stringify({
          error: "Não foi possível carregar o perfil do utilizador.",
          code: "PROFILE_LOAD_FAILED",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (n >= FREE_CONSULTS_PER_DAY) {
      if (profileBefore.credits < 1) {
        return new Response(
          JSON.stringify({
            error:
              "Atingiu o limite de consultas gratuitas hoje. Compre créditos para continuar ou volte amanhã.",
            code: "QUOTA_EXCEEDED",
            free_per_day: FREE_CONSULTS_PER_DAY,
            used_today: n,
            credits: profileBefore.credits ?? 0,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: updated, error: decErr } = await admin
        .from("profiles")
        .update({ credits: profileBefore.credits - 1 })
        .eq("id", user.id)
        .eq("credits", profileBefore.credits)
        .select("credits")
        .single();

      if (decErr || !updated) {
        return new Response(
          JSON.stringify({
            error: "Não foi possível usar créditos. Tente novamente.",
            code: "CREDIT_UPDATE_FAILED",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      usedCredit = true;
    }

    let row: { id: string } | null = null;
    const { data: inserted, error: insErr } = await admin
      .from("reading_consults")
      .insert({
        user_id: user.id,
        dedupe_key: dedupeKey,
        spread_id: spreadId,
        spread_name: spreadName,
        cards,
        used_credit: usedCredit,
        welcome_free_ai: welcomeFreeAi,
      })
      .select("id")
      .single();

    if (!insErr && inserted) {
      row = inserted;
    } else if (insErr) {
      console.error("reading_consults insert:", insErr);
      const { data: raced } = await admin
        .from("reading_consults")
        .select("id, used_credit, welcome_free_ai")
        .eq("user_id", user.id)
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();
      if (raced) {
        const { count: usedTodayRace } = await admin
          .from("reading_consults")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", dayStart);
        const nRace = usedTodayRace ?? 0;
        const freeRemRace = Math.max(0, FREE_CONSULTS_PER_DAY - nRace);
        const { data: profRace } = await admin
          .from("profiles")
          .select("credits")
          .eq("id", user.id)
          .maybeSingle();
        return new Response(
          JSON.stringify({
            consultation_id: raced.id,
            used_credit: raced.used_credit,
            welcome_free_ai: raced.welcome_free_ai ?? false,
            credits_balance: profRace?.credits ?? 0,
            free_remaining_today: freeRemRace,
            duplicate: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (usedCredit) {
        const { data: prof } = await admin.from("profiles").select("credits").eq("id", user.id).maybeSingle();
        if (prof) {
          await admin
            .from("profiles")
            .update({ credits: prof.credits + 1 })
            .eq("id", user.id)
            .eq("credits", prof.credits);
        }
      }
      return new Response(
        JSON.stringify({ error: "Não foi possível registar a consulta.", code: "INSERT_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!row) {
      return new Response(
        JSON.stringify({ error: "Não foi possível registar a consulta.", code: "INSERT_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { count: usedAfter } = await admin
      .from("reading_consults")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", dayStart);

    const nAfter = usedAfter ?? 0;
    const freeRemaining = Math.max(0, FREE_CONSULTS_PER_DAY - nAfter);
    const { data: profAfter } = await admin
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle();

    const summary = usedCredit
      ? "1 crédito usado ao concluir a tiragem (consulta paga)."
      : `Consulta gratuita ao concluir a tiragem (${Math.min(nAfter, FREE_CONSULTS_PER_DAY)}/${FREE_CONSULTS_PER_DAY} no limite diário).`;
    try {
      await admin.from("credit_ledger").insert({
        user_id: user.id,
        credits_delta: usedCredit ? -1 : 0,
        balance_after: profAfter?.credits ?? 0,
        event_type: usedCredit ? "consult_paid" : "consult_free",
        summary,
        ref_table: "reading_consults",
        ref_id: row.id,
      });
    } catch (le) {
      console.error("credit_ledger insert:", le);
    }

    return new Response(
      JSON.stringify({
        consultation_id: row.id,
        used_credit: usedCredit,
        welcome_free_ai: welcomeFreeAi,
        credits_balance: profAfter?.credits ?? 0,
        free_remaining_today: freeRemaining,
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
