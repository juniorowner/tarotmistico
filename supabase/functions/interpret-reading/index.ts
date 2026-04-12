import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { spreadName, labels, cards, question } = await req.json();

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return new Response(
        JSON.stringify({ error: "Dados das cartas são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cardsDescription = cards
      .map((card: any, i: number) => {
        const label = labels?.[i] || `Posição ${i + 1}`;
        return `- ${label}: ${card.emoji} ${card.name} — Significado: ${card.meaning}. Invertida: ${card.reversed}. ${card.description}`;
      })
      .join("\n");

    const prompt = `Você é um tarólogo experiente e intuitivo. Analise a seguinte leitura de Tarô e forneça uma interpretação profunda, mística e personalizada em português brasileiro.

Tipo de leitura: ${spreadName}
${question ? `Pergunta do consulente: ${question}` : "O consulente não fez uma pergunta específica."}

Cartas reveladas:
${cardsDescription}

Instruções:
1. Comece com uma visão geral da energia da leitura
2. Interprete cada carta na sua posição específica
3. Conecte as cartas entre si, mostrando como elas se relacionam
4. Termine com uma mensagem de orientação e conselho prático
5. Use linguagem poética mas acessível
6. Mantenha um tom empático e acolhedor
7. Responda em no máximo 800 palavras`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao chamar a IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const interpretation =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar a interpretação.";

    return new Response(
      JSON.stringify({ interpretation, model: "gemini-1.5-pro" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
