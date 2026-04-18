import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { parseFunctionsHttpError } from "@/lib/ai";
import type { DealtTarotCard } from "@/data/tarotCards";

const GUEST_TOKEN_KEY = "tarot:guest-device-token:v1";
const GUEST_CONSUMED_KEY = "tarot:guest-once-consumed:v1";
/** Pergunta vinda do Hero — consumida ao montar a área de IA. */
export const PENDING_GUEST_QUESTION_KEY = "tarot:pending-question:v1";

/** Antes da 1ª interpretação IA sem conta (limite por aparelho). */
export const GUEST_DEVICE_LIMIT_BEFORE = "✨ Você tem 1 leitura completa gratuita";

/** Linhas do convite pós-leitura guest (conta / interpretação completa). */
export const GUEST_DEVICE_LIMIT_AFTER_LINES = [
  "✨ Há mais nessa leitura...",
  "Desbloqueie a interpretação completa e descubra todos os detalhes.",
] as const;

/** Depois de usar no aparelho — modal, toasts e CTAs de login. */
export const GUEST_DEVICE_LIMIT_AFTER = GUEST_DEVICE_LIMIT_AFTER_LINES.join("\n\n");

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
  const { data, error } = await supabase.functions.invoke("guest-interpret-once", { body });

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
    const err = new Error(r.error);
    (err as Error & { code?: string }).code = r.code;
    throw err;
  }

  if (error instanceof FunctionsFetchError) {
    throw new Error(
      "Sem ligação ao servidor. Verifique a internet e se a função `guest-interpret-once` está deployada."
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
