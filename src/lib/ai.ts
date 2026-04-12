import { supabase } from "@/integrations/supabase/client";
import { TarotCard } from "@/data/tarotCards";

interface InterpretationRequest {
  spreadName: string;
  labels: string[];
  cards: TarotCard[];
  question?: string;
}

interface InterpretationResponse {
  interpretation: string;
  model: string;
}

export async function requestAIInterpretation(
  data: InterpretationRequest
): Promise<InterpretationResponse> {
  const { data: result, error } = await supabase.functions.invoke(
    "interpret-reading",
    {
      body: {
        spreadName: data.spreadName,
        labels: data.labels,
        cards: data.cards,
        question: data.question || "",
      },
    }
  );

  // supabase-js may put the parsed body in either `data` or `error` for non-2xx
  const body = result || (error as any);

  if (body?.error) {
    throw new Error(body.error);
  }

  if (error && !body?.interpretation) {
    throw new Error("Erro ao conectar com a IA. Tente novamente em alguns minutos.");
  }

  return body as InterpretationResponse;
}
