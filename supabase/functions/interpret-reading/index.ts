// Supabase Edge Function — interpretação de Tarot com IA (Gemini / OpenAI / Groq)
// Quota/crédito: debitados ao registar a consulta (commit-reading-consult); aqui só gera texto e liga ai_readings.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { unsafeUserContentMessage, userQuestionFailsSafetyPolicy } from "./safetyContent.ts";

const FREE_AI_PER_DAY = 1;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Card {
  cardId: number;
  cardName: string;
  reversed: boolean;
  keywords: string[];
  meaning: string;
  position?: string;
}

interface ReadingRequest {
  spreadId: string;
  spreadName: string;
  question: string;
  cards: Card[];
  /** UUID em public.reading_consults — quota/crédito já debitados ao concluir a tiragem */
  consultationId: string;
  /** Apaga interpretação guardada e gera outra na mesma consulta (sem novo débito de crédito/quota). */
  replaceExisting?: boolean;
}

function startOfUtcDayIso(): string {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  ).toISOString();
}

/**
 * Junta todo o texto devolvido pelo Gemini (vários `content.parts`).
 * Não filtrar por `thought`: no 2.5 parte da resposta útil pode vir em parts com flags de raciocínio,
 * o que cortava a leitura a meio (ex.: "…Copas invert").
 */
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

/** Cortes típicos a meio de frase (PT-BR) ou respostas muito curtas. */
function looksTruncatedPtBr(text: string): boolean {
  const t = text.trim();
  if (t.length < 80) return true;
  return /\b(com|com\s+o|com\s+a|com\s+os|com\s+as|de|do|da|dos|das|no|na|nos|nas|em|por|para|que)\s*$/i.test(t);
}

type SupabaseAdmin = ReturnType<typeof createClient>;

/** Devolve crédito ou slot grátis se a IA falhar depois da consulta registada. Idempotente. */
async function revokeConsultAfterAiFailure(
  admin: SupabaseAdmin,
  userId: string,
  consultId: string
): Promise<void> {
  const { data: c } = await admin
    .from("reading_consults")
    .select("id, used_credit, revoked_at")
    .eq("id", consultId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!c?.id || c.revoked_at) return;

  const { data: marked } = await admin
    .from("reading_consults")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", consultId)
    .is("revoked_at", null)
    .select("used_credit")
    .maybeSingle();

  if (!marked) return;

  if (marked.used_credit) {
    for (let tries = 0; tries < 5; tries += 1) {
      const { data: prof } = await admin.from("profiles").select("credits").eq("id", userId).maybeSingle();
      if (!prof) break;
      const next = prof.credits + 1;
      const { data: up, error: upErr } = await admin
        .from("profiles")
        .update({ credits: next })
        .eq("id", userId)
        .eq("credits", prof.credits)
        .select("credits")
        .maybeSingle();
      if (!upErr && up) {
        try {
          await admin.from("credit_ledger").insert({
            user_id: userId,
            credits_delta: 1,
            balance_after: up.credits,
            event_type: "refund_ai_failure",
            summary: "Devolução de 1 crédito (falha da interpretação por IA).",
            ref_table: "reading_consults",
            ref_id: consultId,
          });
        } catch (le) {
          console.error("credit_ledger refund:", le);
        }
        break;
      }
    }
  } else {
    const { data: prof } = await admin.from("profiles").select("credits").eq("id", userId).maybeSingle();
    try {
      await admin.from("credit_ledger").insert({
        user_id: userId,
        credits_delta: 0,
        balance_after: prof?.credits ?? 0,
        event_type: "refund_free_consult",
        summary:
          "Consulta gratuita anulada (falha da interpretação por IA) — o slot voltou a contar no limite diário.",
        ref_table: "reading_consults",
        ref_id: consultId,
      });
    } catch (le) {
      console.error("credit_ledger refund free:", le);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(
        JSON.stringify({
          error: "Inicie sessão para usar a interpretação por IA.",
          code: "AUTH_REQUIRED",
        }),
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
        JSON.stringify({
          error: "Sessão inválida. Inicie sessão novamente.",
          code: "AUTH_INVALID",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as ReadingRequest;
    const { spreadId, spreadName, question, cards, consultationId } = body;
    const replaceExisting = body.replaceExisting === true;

    const questionText = typeof question === "string" ? question : "";
    if (userQuestionFailsSafetyPolicy(questionText)) {
      return new Response(
        JSON.stringify({
          error: unsafeUserContentMessage(),
          code: "UNSAFE_CONTENT",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const consultId = (consultationId ?? "").trim();
    if (!consultId || !spreadId || !spreadName || !cards || cards.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "Conclua a tiragem (todas as cartas reveladas) enquanto está autenticado para registar a consulta antes da interpretação por IA.",
          code: "CONSULTATION_REQUIRED",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: consult, error: consultErr } = await admin
      .from("reading_consults")
      .select("id, user_id, used_credit, welcome_free_ai, revoked_at")
      .eq("id", consultId)
      .maybeSingle();

    if (consultErr || !consult || consult.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Consulta inválida ou expirada. Recarregue a página e revele as cartas de novo.",
          code: "CONSULTATION_INVALID",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (consult.revoked_at) {
      return new Response(
        JSON.stringify({
          error:
            "Esta consulta foi anulada (ex.: falha anterior da IA). Inicie uma nova tiragem para registar outra consulta.",
          code: "CONSULTATION_REVOKED",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Regra de produto: consulta registada (grátis do dia ou paga) pode gerar IA.

    let { data: priorAi } = await admin
      .from("ai_readings")
      .select("id, ai_interpretation, model_used")
      .eq("reading_consult_id", consultId)
      .maybeSingle();

    if (replaceExisting) {
      const { error: delErr } = await admin.from("ai_readings").delete().eq("reading_consult_id", consultId);
      if (delErr) {
        console.error("replaceExisting delete ai_readings:", delErr);
        return new Response(
          JSON.stringify({
            error: "Não foi possível preparar nova interpretação. Tente novamente.",
            code: "REPLACE_PREP_FAILED",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      priorAi = null;
    }

    const dayStart = startOfUtcDayIso();
    const { count: consultToday } = await admin
      .from("reading_consults")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", dayStart);
    const consultCount = consultToday ?? 0;
    const freeRemainingAfter = Math.max(0, FREE_AI_PER_DAY - consultCount);

    if (priorAi?.ai_interpretation) {
      const { data: profAfter } = await admin
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .maybeSingle();
      return new Response(
        JSON.stringify({
          success: true,
          interpretation: priorAi.ai_interpretation,
          model: priorAi.model_used ?? "",
          readingId: priorAi.id,
          used_credit: consult.used_credit,
          free_remaining_today: freeRemainingAfter,
          credits_balance: profAfter?.credits ?? 0,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const apiKey =
      Deno.env.get("AI_API_KEY") ?? Deno.env.get("GEMINI_API_KEY") ?? "";
    const aiProvider = Deno.env.get("AI_PROVIDER") || "gemini";
    // gemini-1.5-pro deixou de estar disponível no v1beta para muitas chaves; override: secret GEMINI_MODEL
    const geminiModel = (Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash").replace(
      /^models\//,
      ""
    );
    const geminiMaxOut = Math.min(
      8192,
      Math.max(512, parseInt(Deno.env.get("GEMINI_MAX_OUTPUT_TOKENS") ?? "2048", 10) || 2048)
    );

    try {
    if (!apiKey) {
      throw new Error("AI API key not configured");
    }

    const cardsDescription = cards
      .map((card, index) => {
        const orient = card.reversed ? "invertida" : "direita";
        return `${index + 1}. **${card.cardName}** (${orient})
   - Posição: ${card.position || `Carta ${index + 1}`}
   - Palavras-chave: ${card.keywords.join(", ")}
   - Significado nesta orientação (${orient}): ${card.meaning}`;
      })
      .join("\n\n");

    const prompt = `Você é um tarólogo experiente e intuitivo. Analise esta leitura de Tarot e forneça uma interpretação clara, objetiva e acolhedora.

**Política de segurança (obrigatória):** Nunca incentive violência, crime, ódio, autoagressão nem forneça instruções para fabricar armas, venenos ou explosivos. Também **não** faça previsões categóricas sobre saúde, gravidez ou morte (ex.: diagnóstico, "você está grávida", "vai morrer em X dias"). Se a pergunta pedir qualquer um desses temas proibidos, responda **apenas** com 2–3 frases em português do Brasil: que este serviço não pode ajudar com esse tipo de pedido; oriente a procurar profissional adequado (médico, psicológico, jurídico etc., e emergência/CVV 188 quando aplicável); **não** interprete as cartas para esse fim. Caso a pergunta seja adequada, siga as instruções abaixo normalmente.

**Contexto obrigatório:** Esta aplicação utiliza o **baralho completo de Tarot (78 cartas)**: **22 Arcanos Maiores** e **56 Arcanos Menores** (naipes Copas, Espadas, Ouros e Paus). Cada carta na lista abaixo foi realmente sorteada nesta tiragem — respeite **rigorosamente** a orientação **direita ou invertida** indicada; o texto de significado já corresponde a essa orientação. Quando for Arcano Menor, reconheça o naipe e o tom típico desse naipe em conjunto com a posição.

**Tipo de Tiragem:** ${spreadName}
**Pergunta do Consulente:** ${questionText.trim() || "Não especificada - leitura geral"}

**Cartas nesta tiragem (${cards.length}):**
${cardsDescription}

**Instruções:**
1. Comece com uma **visão geral** da energia da tiragem (1–2 frases).
2. Faça uma **leitura integrada** das cartas e posições, sem listar carta por carta.
3. Responda **diretamente** à pergunta do consulente; se for geral, foque em direção prática para os próximos dias.
4. Inclua **conselhos práticos** objetivos (ações e cuidados) em linguagem simples.
5. Feche com **síntese curta e motivadora**.
6. Use linguagem empática e acessível, em **português do Brasil**.
7. **Extensão alvo:** cerca de **180 a 260 palavras**. Seja útil sem ficar longo.
8. **Orientação:** não ignore cartas invertidas; respeite os significados fornecidos.
9. Inclua sempre, no último parágrafo, um aviso curto de responsabilidade: "Esta leitura é para reflexão e não substitui orientação profissional."
10. **Importante:** conclua sempre com uma frase completa e pontuação final (. ! ou ?).

**Formato:** texto fluido em 3 a 4 parágrafos, sem títulos numerados.`;

    let aiInterpretation = "";
    let modelUsed = "";

    if (aiProvider === "gemini") {
      let maxOut = geminiMaxOut;
      let lastFinish = "";

      for (let attempt = 0; attempt < 2; attempt++) {
        const generationConfig: Record<string, unknown> = {
          temperature: 0.88,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: maxOut,
        };
        // Só Gemini 2.5+ expõe thinking; desligar evita cortar a resposta visível quando o orçamento vai todo para o raciocínio interno.
        if (/gemini[^a-z0-9]*2[^a-z0-9]*5|2\.5-flash|2\.5-pro/i.test(geminiModel)) {
          generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            geminiModel
          )}:generateContent?key=${encodeURIComponent(apiKey)}`,
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
          console.error("Gemini API error:", data);
          const msg =
            data?.error?.message ||
            (typeof data?.error === "string" ? data.error : "Gemini API error");
          throw new Error(msg);
        }

        aiInterpretation = extractGeminiInterpretationText(data as Record<string, unknown>);
        lastFinish = (data as { candidates?: Array<{ finishReason?: string }> }).candidates?.[0]?.finishReason ?? "";

        const truncated =
          lastFinish === "MAX_TOKENS" ||
          (aiInterpretation.length > 0 && looksTruncatedPtBr(aiInterpretation));

        if (!aiInterpretation) break;
        if (!truncated) break;
        if (attempt === 0) {
          maxOut = Math.min(8192, Math.max(maxOut + 512, maxOut * 2));
          console.warn("interpret-reading: resposta truncada; nova tentativa com maxOutputTokens=", maxOut);
        }
      }

      if (lastFinish === "MAX_TOKENS" || looksTruncatedPtBr(aiInterpretation)) {
        throw new Error(
          "A resposta da IA veio incompleta. Tente novamente; o seu crédito ou vaga grátis foi reposto se já tivesse sido debitado."
        );
      }
      modelUsed = geminiModel;
    } else if (aiProvider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "Você é um tarólogo experiente. Esta app usa baralho completo (78 cartas: Maiores e Menores). Só mencione cartas que constarem na tiragem enviada pelo utilizador. Recuse violência, crime, autoagressão e instruções perigosas. Não faça previsões categóricas sobre saúde, gravidez ou morte. Inclua aviso curto de que não substitui orientação profissional.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.88,
          max_tokens: 1200,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "OpenAI API error");
      }

      aiInterpretation = data.choices[0]?.message?.content || "";
      modelUsed = "gpt-3.5-turbo";
    } else if (aiProvider === "groq") {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "Você é um tarólogo experiente. Esta app usa baralho completo (78 cartas: Maiores e Menores). Só mencione cartas que constarem na tiragem enviada pelo utilizador. Recuse violência, crime, autoagressão e instruções perigosas. Não faça previsões categóricas sobre saúde, gravidez ou morte. Inclua aviso curto de que não substitui orientação profissional.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.88,
          max_tokens: 1200,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Groq API error");
      }

      aiInterpretation = data.choices[0]?.message?.content || "";
      modelUsed = "llama-3.1-70b";
    } else {
      throw new Error(`Unknown AI_PROVIDER: ${aiProvider}`);
    }

    if (!aiInterpretation) {
      throw new Error("No interpretation generated");
    }

    let savedReading: { id?: string } | null = null;

    const { data: row, error: dbError } = await admin
      .from("ai_readings")
      .insert({
        spread_id: spreadId,
        spread_name: spreadName,
        question: questionText.trim() || null,
        cards: cards,
        ai_interpretation: aiInterpretation,
        model_used: modelUsed,
        user_id: user.id,
        reading_consult_id: consultId,
      })
      .select()
      .single();

    if (dbError || !row) {
      console.error("Database error:", dbError);
      throw new Error("Não foi possível guardar a interpretação.");
    }
    savedReading = row;

    const { count: consultTodayAfter } = await admin
      .from("reading_consults")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", dayStart);
    const freeRemaining = Math.max(0, FREE_AI_PER_DAY - (consultTodayAfter ?? 0));
    const { data: profAfter } = await admin
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        interpretation: aiInterpretation,
        model: modelUsed,
        readingId: savedReading?.id ?? null,
        used_credit: consult.used_credit,
        free_remaining_today: freeRemaining,
        credits_balance: profAfter?.credits ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    } catch (runErr: unknown) {
      await revokeConsultAfterAiFailure(admin, user.id, consultId);
      throw runErr;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: message || "Internal server error",
        details: String(error),
        hint:
          "Se a consulta já estava registada, o crédito ou a vaga grátis podem ter sido devolvidos — veja «Movimentos de créditos» na página de créditos.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
