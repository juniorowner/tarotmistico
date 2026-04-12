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

  if (error) {
    throw new Error(error.message || "Erro ao conectar com a IA");
  }

  if (result?.error) {
    throw new Error(result.error);
  }

  return result as InterpretationResponse;
}
