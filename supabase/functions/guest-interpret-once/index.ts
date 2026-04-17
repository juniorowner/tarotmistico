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

/** Junta todo o texto devolvido pelo Gemini (vários `content.parts`). */
function extractGeminiInterpretationText(data: Record<string, unknown>): string {
  const candidates = data.candidates as
    | Array<{ content?: { parts?: Array<Record<string, unknown> | null> } }>
    | undefined;

  if (!Array.isArray(candidates)) return "";

  for (const cand of candidates) {
    const parts = cand?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) continue;

    const chunks: string[] = [];
    for (const p of parts) {
      if (p == null || typeof p !== "object") continue;
      const t = (p as { text?: unknown }).text;
      if (typeof t === "string" && t.length > 0) chunks.push(t);
    }
    const joined = chunks.join("");
    if (joined.trim().length > 0) return joined;
  }

  return "";
}

function getGeminiFinishReason(data: Record<string, unknown>): string {
  const c = (data.candidates as Array<{ finishReason?: string }> | undefined)?.[0];
  return typeof c?.finishReason === "string" ? c.finishReason : "";
}

/** Cortes típicos a meio de frase (PT-BR) ou respostas muito curtas. */
function looksTruncatedPtBr(text: string): boolean {
  const t = text.trim();
  if (t.length < 80) return true;
  return /\b(com|com\s+o|com\s+a|com\s+os|com\s+as|de|do|da|dos|das|no|na|nos|nas|em|por|para|que)\s*$/i.test(t);
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
    const apiKey = Deno.env.get("AI_API_KEY") ?? Deno.env.get("GEMINI_API_KEY") ?? "";
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

    const { data: existing } = await admin
      .from("guest_device_locks")
      .select("id")
      .or(`token_hash.eq.${tokenHash},fingerprint_hash.eq.${fpHash}`)
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

    const model = (Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash").replace(/^models\//, "");
    let geminiMaxOut = Math.min(
      8192,
      Math.max(1024, parseInt(Deno.env.get("GEMINI_MAX_OUTPUT_TOKENS") ?? "3072", 10) || 3072)
    );

    let interpretation = "";
    let lastFinish = "";

    for (let attempt = 0; attempt < 2; attempt++) {
      const generationConfig: Record<string, unknown> = {
        temperature: 0.88,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: geminiMaxOut,
      };
      if (/gemini[^a-z0-9]*2[^a-z0-9]*5|2\.5-flash|2\.5-pro/i.test(model)) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        return new Response(JSON.stringify({ error: data?.error?.message || "AI error", code: "AI_FAILED" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      interpretation = extractGeminiInterpretationText(data as Record<string, unknown>);
      lastFinish = getGeminiFinishReason(data as Record<string, unknown>);

      const truncated =
        lastFinish === "MAX_TOKENS" ||
        (interpretation.length > 0 && looksTruncatedPtBr(interpretation));

      if (!interpretation) break;
      if (!truncated) break;
      if (attempt === 0) {
        geminiMaxOut = Math.min(8192, Math.max(geminiMaxOut + 512, geminiMaxOut * 2));
        console.warn("guest-interpret-once: resposta truncada; nova tentativa com maxOutputTokens=", geminiMaxOut);
      }
    }

    if (!interpretation) {
      return new Response(JSON.stringify({ error: "Sem interpretação gerada.", code: "AI_EMPTY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (lastFinish === "MAX_TOKENS" || looksTruncatedPtBr(interpretation)) {
      return new Response(
        JSON.stringify({
          error:
            "A leitura veio incompleta. Aguarde um instante e tente novamente. A sua consulta grátis neste dispositivo ainda não foi contabilizada.",
          code: "AI_TRUNCATED",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        msg.includes("guest_device_locks_token_hash_key") ||
        msg.includes("guest_device_locks_fingerprint_hash_key");
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
      model_used: model,
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

    return new Response(
      JSON.stringify({ interpretation, model, guest_consumed: true }),
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
