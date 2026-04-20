import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Card {
  cardName: string;
  reversed: boolean;
  keywords: string[];
  meaning: string;
  position?: string;
}

interface Payload {
  deviceToken: string;
  deviceFingerprint: string;
  spreadName: string;
  question?: string;
  cards: Card[];
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    ""
  ).trim();
}

function utcTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function isAiBusyMessage(msg: string): boolean {
  return /(model\s+is\s+curr\w*\s+exper\w*\s+high|currently\s+exper\w*\s+high|high\s+demand|spikes\s+in\s+demand|resource\s+exhausted|rate\s+limit|temporar(?:ily|iamente)\s+unavailable|overloaded)/i.test(
    msg
  );
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const aiProvider = Deno.env.get("AI_PROVIDER") ?? "openai";
    const apiKey =
      Deno.env.get("AI_API_KEY") ??
      Deno.env.get("OPENAI_API_KEY") ??
      "";
    if (!supabaseUrl || !serviceKey || !apiKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const admin = createClient(supabaseUrl, serviceKey);

    const body = (await req.json()) as Payload;
    const token = (body.deviceToken ?? "").trim();
    const fp = (body.deviceFingerprint ?? "").trim();
    const spreadName = (body.spreadName ?? "").trim();
    const cards = Array.isArray(body.cards) ? body.cards : [];
    const question = (body.question ?? "").trim();
    if (!token || !fp || !spreadName || cards.length < 1) {
      return new Response(JSON.stringify({ error: "Payload inválido.", code: "INVALID_BODY" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenHash = await sha256Hex(`tok:${token}`);
    const fpHash = await sha256Hex(`fp:${fp}`);

    const rawIp = clientIp(req);
    const ipHash = rawIp ? await sha256Hex(`ip:${rawIp}`) : "";
    const maxPerIp = Math.max(
      1,
      parseInt(Deno.env.get("GUEST_MAX_COMPLETIONS_PER_IP_PER_DAY") ?? "3", 10) || 3
    );
    const dayUtc = utcTodayDateString();

    if (ipHash) {
      const { data: ipRow } = await admin
        .from("guest_ip_daily_counts")
        .select("completions")
        .eq("ip_hash", ipHash)
        .eq("day_utc", dayUtc)
        .maybeSingle();
      const ipCount = ipRow?.completions ?? 0;
      if (ipCount >= maxPerIp) {
        return new Response(
          JSON.stringify({
            error:
              "O limite de interpretações gratuitas para esta rede hoje foi atingido. Crie uma conta ou tente novamente amanhã.",
            code: "GUEST_IP_DAILY_LIMIT",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Só token_hash identifica o “aparelho” do guest (UUID em localStorage). fingerprint colide
    // entre muitos telemóveis com o mesmo UA/idioma/timezone — não usar para bloqueio único.
    const { data: existing } = await admin
      .from("guest_device_locks")
      .select("id")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({
          error: "A consulta completa grátis neste dispositivo já foi utilizada. Faça login/cadastro para continuar.",
          code: "GUEST_ALREADY_USED",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cardsDescription = cards
      .map((card, i) => {
        const orient = card.reversed ? "invertida" : "direita";
        return `${i + 1}. ${card.cardName} (${orient}) — ${card.position || `Carta ${i + 1}`}: ${card.meaning}`;
      })
      .join("\n");

    const prompt = `Você é um tarólogo experiente. Interprete esta tiragem com tom claro e acolhedor.

Tipo de tiragem: ${spreadName}
Pergunta: ${question || "Leitura geral"}
Cartas:
${cardsDescription}

Responda em português do Brasil, 3-4 parágrafos, sem tópicos, com aviso curto no final de que não substitui orientação profissional.
**Importante:** termine sempre com uma frase completa e pontuação final (. ! ou ?).`;

    const openaiModel = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

    let interpretation = "";

    if (aiProvider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: [
            {
              role: "system",
              content:
                "Você é um tarólogo experiente. Escreva em português do Brasil com clareza e acolhimento. Inclua no final um aviso curto de que não substitui orientação profissional.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.88,
          max_tokens: 900,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const msg = data?.error?.message || "AI error";
        if (isAiBusyMessage(msg) || response.status === 429 || response.status === 503) {
          return new Response(
            JSON.stringify({
              error: "A IA está com alta procura neste momento. Aguarde alguns segundos e tente novamente.",
              code: "AI_BUSY",
            }),
            {
              status: 503,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        return new Response(JSON.stringify({ error: msg, code: "AI_FAILED" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      interpretation = data?.choices?.[0]?.message?.content || "";
    } else {
      return new Response(
        JSON.stringify({
          error: `AI_PROVIDER inválido: ${aiProvider}. Use "openai".`,
          code: "AI_PROVIDER_INVALID",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!interpretation) {
      return new Response(JSON.stringify({ error: "Sem interpretação gerada.", code: "AI_EMPTY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cardsJson = JSON.parse(JSON.stringify(cards)) as unknown[];

    const { data: lockRow, error: lockErr } = await admin
      .from("guest_device_locks")
      .insert({
        token_hash: tokenHash,
        fingerprint_hash: fpHash,
      })
      .select("id")
      .single();
    if (lockErr) {
      const msg = (lockErr.message || "").toLowerCase();
      const duplicate =
        msg.includes("duplicate key") ||
        msg.includes("unique constraint") ||
        msg.includes("guest_device_locks_token_hash_key");
      if (duplicate) {
        return new Response(
          JSON.stringify({
            error: "A consulta completa grátis neste dispositivo já foi utilizada. Faça login/cadastro para continuar.",
            code: "GUEST_ALREADY_USED",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          error:
            "Não foi possível registar o bloqueio do dispositivo. Verifique se a tabela guest_device_locks foi criada.",
          code: "GUEST_LOCK_FAILED",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Histórico obrigatório: sem linha em guest_questions não devolvemos sucesso (evita “sumiu” no painel/SQL).
    const { error: guestLogErr } = await admin.from("guest_questions").insert({
      token_hash: tokenHash,
      fingerprint_hash: fpHash,
      spread_name: spreadName,
      question: question || null,
      cards: cardsJson,
      interpretation,
      model_used: openaiModel,
    });
    if (guestLogErr) {
      console.error("guest_questions insert error:", guestLogErr);
      if (lockRow?.id) {
        const { error: rollbackErr } = await admin.from("guest_device_locks").delete().eq("id", lockRow.id);
        if (rollbackErr) console.error("guest_device_locks rollback error:", rollbackErr);
      }
      return new Response(
        JSON.stringify({
          error:
            "Não foi possível guardar a consulta no servidor. Confirme a tabela guest_questions e as permissões (migration 20260424120000). Tente novamente.",
          code: "GUEST_LOG_FAILED",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (ipHash) {
      const { data: ipBefore } = await admin
        .from("guest_ip_daily_counts")
        .select("completions")
        .eq("ip_hash", ipHash)
        .eq("day_utc", dayUtc)
        .maybeSingle();
      const next = (ipBefore?.completions ?? 0) + 1;
      const { error: ipErr } = await admin.from("guest_ip_daily_counts").upsert(
        { ip_hash: ipHash, day_utc: dayUtc, completions: next },
        { onConflict: "ip_hash,day_utc" }
      );
      if (ipErr) {
        console.error("guest_ip_daily_counts upsert:", ipErr);
      }
    }

    return new Response(
      JSON.stringify({
        interpretation,
        model: openaiModel,
        guest_consumed: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("guest-interpret-once error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
