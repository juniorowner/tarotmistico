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

    const { error: lockErr } = await admin.from("guest_device_locks").insert({
      token_hash: tokenHash,
      fingerprint_hash: fpHash,
    });
    if (lockErr) {
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

Responda em português do Brasil, 3-4 parágrafos, sem tópicos, com aviso curto no final de que não substitui orientação profissional.`;

    const model = (Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash").replace(/^models\//, "");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.88, topK: 40, topP: 0.95, maxOutputTokens: 1600 },
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

    const interpretation =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p?.text || "").join("")?.trim() || "";
    if (!interpretation) {
      return new Response(JSON.stringify({ error: "Sem interpretação gerada.", code: "AI_EMPTY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
