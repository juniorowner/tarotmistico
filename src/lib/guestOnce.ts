import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { supabase } from "@/integrations/supabase/client";
import { parseFunctionsHttpError } from "@/lib/ai";
import type { DealtTarotCard } from "@/data/tarotCards";

const GUEST_TOKEN_KEY = "tarot:guest-device-token:v1";
const GUEST_CONSUMED_KEY = "tarot:guest-once-consumed:v1";
/** Pergunta vinda do Hero — consumida ao montar a área de IA. */
export const PENDING_GUEST_QUESTION_KEY = "tarot:pending-question:v1";

/** Hint no selector de tiragem (guest): sem “você tem 1 leitura grátis”. */
export const GUEST_SPREAD_SELECTOR_HINT =
  "Revele todas as cartas e peça a interpretação com IA. Para novas leituras completas e histórico, crie uma conta.";

/** Área de IA antes do primeiro pedido (guest): sem promessa de “1 grátis”. */
export const GUEST_AI_PRE_INTERP_HINT =
  "Quando todas as cartas estiverem reveladas, use o botão abaixo para ver a interpretação com IA desta tiragem.";

/** Cenário 1 — após a 1ª interpretação guest (texto completo já mostrado): CTA + modal. */
export const GUEST_POST_FIRST_INTERP_LINES = [
  "✨ Quer aprofundar ainda mais?",
  "Faça uma nova leitura e descubra novos caminhos.",
] as const;

/** Texto extra no modal de auth ao clicar “Fazer nova pergunta” (guest). */
export const GUEST_POST_FIRST_AUTH_SUBTEXT =
  "Entre ou crie uma conta para continuar com novas perguntas e interpretações completas.";

/** Rótulo do botão principal após a 1ª interpretação guest. */
export const GUEST_POST_FIRST_CTA_BUTTON = "👉 Fazer nova pergunta";

/** Cenário 2 — guest já usou: não há nova interpretação; só convite (sem texto da IA). */
export const GUEST_BLOCKED_TEASER_LINES = [
  "✨ Há mais nessa leitura...",
  "Continue para descobrir o restante da sua resposta.",
] as const;

/** Texto para `openAuthDialog` após sucesso na 1ª interpretação guest. */
export const GUEST_DEVICE_LIMIT_AFTER = [
  ...GUEST_POST_FIRST_INTERP_LINES,
  GUEST_POST_FIRST_AUTH_SUBTEXT,
].join("\n\n");

/** Texto para `openAuthDialog` quando o guest já consumiu / bloqueado. */
export const GUEST_DEVICE_LIMIT_BLOCKED = GUEST_BLOCKED_TEASER_LINES.join("\n\n");

/** Lê e apaga a pergunta guardada pelo Hero (sessionStorage). */
export function consumePendingGuestQuestion(): string {
  if (typeof window === "undefined") return "";
  try {
    const v = sessionStorage.getItem(PENDING_GUEST_QUESTION_KEY) ?? "";
    sessionStorage.removeItem(PENDING_GUEST_QUESTION_KEY);
    return v.trim();
  } catch {
    return "";
  }
}

export function hasGuestOnceBeenConsumedLocally(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(GUEST_CONSUMED_KEY) === "1";
}

export function markGuestOnceConsumedLocally() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_CONSUMED_KEY, "1");
}

export function getOrCreateGuestDeviceToken(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(GUEST_TOKEN_KEY);
  if (existing) return existing;
  const token = crypto.randomUUID();
  window.localStorage.setItem(GUEST_TOKEN_KEY, token);
  return token;
}

export function getGuestDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server";
  const nav = window.navigator;
  return [
    nav.userAgent,
    nav.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(nav.hardwareConcurrency ?? ""),
    String(nav.platform ?? ""),
  ].join("|");
}

function isAiBusyLikeMessage(input: string): boolean {
  return /(model\s+is\s+curr\w*\s+exper\w*\s+high|currently\s+exper\w*\s+high|high\s+demand|spikes?\s+in\s+demand|resource\s+exhausted|rate\s*limit|temporar(?:ily|iamente)\s+unavailable|overloaded)/i.test(
    input
  );
}

export async function requestGuestInterpretationOnce(input: {
  spreadName: string;
  labels: string[];
  cards: DealtTarotCard[];
  question?: string;
}): Promise<{ interpretation: string; model: string; guest_consumed: boolean }> {
  const body = {
    deviceToken: getOrCreateGuestDeviceToken(),
    deviceFingerprint: getGuestDeviceFingerprint(),
    spreadName: input.spreadName,
    question: input.question ?? "",
    cards: input.cards.map((c, i) => ({
      cardName: c.name,
      reversed: c.isReversed,
      keywords: [],
      meaning: c.isReversed ? c.reversed : c.meaning,
      position: input.labels[i] || `Carta ${i + 1}`,
    })),
  };
  const { data, error } = await invokeEdgeFunction("guest-interpret-once", { body });

  if (
    !error &&
    data &&
    typeof data === "object" &&
    "interpretation" in data &&
    typeof (data as { interpretation?: unknown }).interpretation === "string"
  ) {
    return data as { interpretation: string; model: string; guest_consumed: boolean };
  }

  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  ) {
    const r = data as { error: string; code?: string };
    const aiBusy = isAiBusyLikeMessage(r.error);
    const err = new Error(
      aiBusy ? "A IA está com alta procura neste momento. Tente novamente em alguns segundos." : r.error
    );
    (err as Error & { code?: string }).code = aiBusy ? "AI_BUSY" : r.code;
    throw err;
  }

  if (error instanceof FunctionsFetchError) {
    throw new Error(
      "Não conseguimos obter a interpretação agora. Verifique a internet e tente de novo."
    );
  }
  if (error instanceof FunctionsRelayError) {
    throw new Error("O serviço está temporariamente indisponível. Tente novamente em instantes.");
  }
  if (error instanceof FunctionsHttpError) {
    const parsed = await parseFunctionsHttpError(error);
    const err = new Error(parsed.message);
    (err as Error & { code?: string }).code = parsed.code;
    throw err;
  }
  if (error) {
    throw new Error(error.message || "Erro ao contactar a interpretação grátis.");
  }

  throw new Error("Resposta inesperada da interpretação grátis.");
}
