import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getValidAccessTokenForFunctions } from "@/lib/ai";

/** Resposta da Edge Function `ai-quota` */
export interface AiQuotaResponse {
  /** Máximo de consultas completas grátis por conta (vitalício). */
  free_per_account: number;
  /** Consultas completas já registadas (não revogadas). */
  consults_completed: number;
  /** Vagas grátis restantes na conta (0 ou 1). O nome do campo mantém compatibilidade com o backend. */
  free_remaining_today: number;
  credits_balance: number;
}

export async function fetchAiQuota(): Promise<AiQuotaResponse | null> {
  try {
    const token = await getValidAccessTokenForFunctions();
    const { data, error } = await supabase.functions.invoke("ai-quota", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) {
      if (error instanceof FunctionsHttpError || error instanceof FunctionsFetchError) {
        return null;
      }
      if (error instanceof FunctionsRelayError) return null;
      return null;
    }
    if (
      data &&
      typeof data === "object" &&
      "free_remaining_today" in data &&
      typeof (data as AiQuotaResponse).free_remaining_today === "number"
    ) {
      return data as AiQuotaResponse;
    }
    return null;
  } catch {
    return null;
  }
}
