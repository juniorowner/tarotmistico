import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
  type Session,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { DealtTarotCard } from "@/data/tarotCards";

export interface InterpretationRequest {
  spreadId: string;
  spreadName: string;
  labels: string[];
  cards: DealtTarotCard[];
  question?: string;
  /** Registo da tiragem completa (quota/crédito já aplicados) */
  consultationId: string;
  /** Mesma consulta: apagar interpretação anterior e gerar outra (sem novo débito). */
  replaceExisting?: boolean;
}

export interface InterpretationResponse {
  interpretation: string;
  model: string;
  readingId?: string | null;
  free_remaining_today?: number;
  credits_balance?: number;
  used_credit?: boolean;
}

interface ApiCard {
  cardId: number;
  cardName: string;
  reversed: boolean;
  keywords: string[];
  meaning: string;
  position?: string;
}

function tarotCardsToApiCards(cards: DealtTarotCard[], labels: string[]): ApiCard[] {
  type Suit = NonNullable<DealtTarotCard["suit"]>;
  const suitPt: Record<Suit, string> = {
    cups: "Copas",
    swords: "Espadas",
    pentacles: "Ouros",
    wands: "Paus",
  };

  return cards.map((card, i) => {
    const inverted = card.isReversed;
    const role =
      card.arcana === "minor" && card.suit
        ? `Arcano menor (${suitPt[card.suit]})`
        : "Arcano maior";
    const effectiveMeaning = inverted ? card.reversed : card.meaning;
    const otherPole = inverted ? card.meaning : card.reversed;

    return {
      cardId: card.id,
      cardName: card.name,
      reversed: inverted,
      keywords: [
        card.name,
        inverted ? "Carta invertida" : "Carta direita",
        role,
        ...effectiveMeaning.split(",").map((s) => s.trim()).filter(Boolean),
        ...otherPole.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2),
      ].slice(0, 12),
      meaning: effectiveMeaning,
      position: labels[i] || `Carta ${i + 1}`,
    };
  });
}

/** Lê o corpo da resposta HTTP da Edge Function (só pode ler uma vez). */
export async function parseFunctionsHttpError(
  err: FunctionsHttpError
): Promise<{ message: string; code?: string; credits?: number; hint?: string }> {
  const res = err.context;
  const status = res?.status ?? 0;
  if (!res) {
    return { message: err.message || "Erro desconhecido na função." };
  }

  try {
    const text = await res.text();
    if (!text.trim()) {
      if (status === 401) {
        return {
          message:
            "Sessão expirada ou token inválido. Saia e entre de novo, depois tente a interpretação.",
          code: "AUTH_INVALID",
        };
      }
      return {
        message: `A função devolveu erro ${status} sem mensagem. Confirme se \`interpret-reading\` está deployada e com secrets (ex.: GEMINI_API_KEY).`,
      };
    }
    try {
      const payload = JSON.parse(text) as {
        error?: string;
        message?: string;
        code?: string;
        credits?: number;
        hint?: string;
      };
      const raw = payload?.error ?? payload?.message;
      if (raw) {
        const invalidJwt = /invalid\s+jwt/i.test(String(raw));
        const msg = invalidJwt
          ? "Sessão inválida ou expirada (JWT). Saia, entre de novo e tente outra vez. Se mudou o projeto Supabase no site, limpe dados do site ou use outra janela anónima."
          : raw;
        return {
          message: msg,
          code: invalidJwt
            ? "AUTH_INVALID"
            : typeof payload.code === "string"
              ? payload.code
              : undefined,
          credits: payload.credits,
          hint: typeof payload.hint === "string" ? payload.hint : undefined,
        };
      }
      if (status === 401) {
        return {
          message:
            "Sessão expirada ou token inválido. Saia e entre de novo, depois tente a interpretação.",
          code: "AUTH_INVALID",
        };
      }
    } catch {
      return {
        message: text.length > 400 ? `${text.slice(0, 400)}…` : text,
      };
    }
  } catch {
    /* ignore */
  }
  if (status === 401) {
    return {
      message:
        "Sessão expirada ou token inválido. Saia e entre de novo, depois tente a interpretação.",
      code: "AUTH_INVALID",
    };
  }
  return {
    message: `Erro na função (${status}). Tente novamente ou verifique o deploy da Edge Function.`,
  };
}

/**
 * Obtém um access_token aceite pelo gateway das Edge Functions.
 * Não usar o token do estado React em primeiro lugar: pode estar **expirado** no storage
 * enquanto a UI ainda mostra o utilizador — o gateway devolve "Invalid JWT".
 * `getUser()` valida o JWT com o servidor Auth; se falhar, tentamos `refreshSession()`.
 */
export async function getValidAccessTokenForFunctions(): Promise<string> {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    const { data: ref, error: refErr } = await supabase.auth.refreshSession();
    if (refErr) console.warn("refreshSession (após getUser falhar):", refErr.message);
    const t = ref.session?.access_token?.trim();
    if (t) return t;
    throw new Error("AUTH_REQUIRED");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  let token = session?.access_token?.trim() ?? "";
  if (token) return token;

  const { data: ref2, error: refErr2 } = await supabase.auth.refreshSession();
  if (refErr2) console.warn("refreshSession (sem access_token na sessão):", refErr2.message);
  token = ref2.session?.access_token?.trim() ?? "";
  if (token) return token;

  throw new Error("AUTH_REQUIRED");
}

export interface RequestAIOptions {
  /** Reservado; o token passa sempre por getUser/refresh para evitar JWT expirado */
  session?: Session | null;
}

export async function requestAIInterpretation(
  data: InterpretationRequest,
  _options?: RequestAIOptions
): Promise<InterpretationResponse> {
  const accessToken = await getValidAccessTokenForFunctions();

  const body: Record<string, unknown> = {
    spreadId: data.spreadId,
    spreadName: data.spreadName,
    question: data.question || "",
    cards: tarotCardsToApiCards(data.cards, data.labels),
    consultationId: data.consultationId,
  };
  if (data.replaceExisting === true) {
    body.replaceExisting = true;
  }

  const invoke = (token: string) =>
    supabase.functions.invoke("interpret-reading", {
      body,
      headers: { Authorization: `Bearer ${token}` },
    });

  let { data: result, error } = await invoke(accessToken);

  if (error instanceof FunctionsHttpError && (error.context?.status ?? 0) === 401) {
    const { data: ref, error: refErr } = await supabase.auth.refreshSession();
    if (refErr) console.warn("refreshSession após 401:", refErr.message);
    let retryToken = ref.session?.access_token?.trim() ?? "";
    if (!retryToken) {
      const {
        data: { session: s3 },
      } = await supabase.auth.getSession();
      retryToken = s3?.access_token?.trim() ?? "";
    }
    if (retryToken) {
      ({ data: result, error } = await invoke(retryToken));
    }
  }

  if (
    !error &&
    result &&
    typeof result === "object" &&
    "interpretation" in result &&
    typeof (result as { interpretation?: unknown }).interpretation === "string"
  ) {
    const r = result as InterpretationResponse & { success?: boolean };
    return {
      interpretation: r.interpretation,
      model: r.model ?? "",
      readingId: r.readingId ?? null,
      free_remaining_today: r.free_remaining_today,
      credits_balance: r.credits_balance,
      used_credit: r.used_credit,
    };
  }

  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    typeof (result as { error?: unknown }).error === "string"
  ) {
    const r = result as { error: string; code?: string };
    const err = new Error(r.error);
    (err as Error & { code?: string }).code = r.code;
    throw err;
  }

  if (error instanceof FunctionsFetchError) {
    throw new Error(
      "Sem ligação ao servidor da função. Verifique a internet, o URL do Supabase e se a função `interpret-reading` está deployada."
    );
  }

  if (error instanceof FunctionsRelayError) {
    throw new Error(
      "O serviço de funções está temporariamente indisponível. Tente novamente em alguns minutos."
    );
  }

  if (error instanceof FunctionsHttpError) {
    const parsed = await parseFunctionsHttpError(error);
    const err = new Error(parsed.message);
    (err as Error & { code?: string; credits?: number; hint?: string }).code = parsed.code;
    (err as Error & { credits?: number }).credits = parsed.credits;
    (err as Error & { hint?: string }).hint = parsed.hint;
    throw err;
  }

  if (error) {
    throw new Error(
      error.message ||
        "Erro ao contactar a IA. Tente novamente em alguns minutos."
    );
  }

  throw new Error("Resposta inesperada da IA.");
}
