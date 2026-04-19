import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { getValidAccessTokenForFunctions } from "@/lib/ai";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import type { DealtTarotCard } from "@/data/tarotCards";

export interface CommitReadingConsultRequest {
  dedupeKey: string;
  spreadId: string;
  spreadName: string;
  cards: DealtTarotCard[];
}

export interface CommitReadingConsultResponse {
  consultation_id: string;
  used_credit: boolean;
  welcome_free_ai?: boolean;
  credits_balance: number;
  free_remaining_today: number;
  duplicate?: boolean;
}

export async function commitReadingConsult(
  data: CommitReadingConsultRequest
): Promise<CommitReadingConsultResponse> {
  const token = await getValidAccessTokenForFunctions();
  const { data: result, error } = await invokeEdgeFunction("commit-reading-consult", {
    body: {
      dedupeKey: data.dedupeKey,
      spreadId: data.spreadId,
      spreadName: data.spreadName,
      cards: data.cards,
    },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error instanceof FunctionsFetchError) {
    throw new Error(
      "Não conseguimos registar a consulta agora. Verifique a internet e tente de novo."
    );
  }
  if (error instanceof FunctionsRelayError) {
    throw new Error("Serviço temporariamente indisponível.");
  }
  if (error instanceof FunctionsHttpError) {
    const t = await error.context.text();
    let msg = "Não foi possível registar a consulta.";
    let code: string | undefined;
    try {
      const j = JSON.parse(t) as { error?: string; code?: string; credits?: number };
      if (j.error) msg = j.error;
      code = j.code;
    } catch {
      /* ignore */
    }
    const err = new Error(msg);
    (err as Error & { code?: string }).code = code;
    throw err;
  }

  if (
    result &&
    typeof result === "object" &&
    "consultation_id" in result &&
    typeof (result as CommitReadingConsultResponse).consultation_id === "string"
  ) {
    return result as CommitReadingConsultResponse;
  }

  if (result && typeof result === "object" && "error" in result) {
    throw new Error(String((result as { error: string }).error));
  }

  throw new Error("Resposta inválida ao registar a consulta.");
}
