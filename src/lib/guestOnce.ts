import { supabase } from "@/integrations/supabase/client";
import type { DealtTarotCard } from "@/data/tarotCards";

const GUEST_TOKEN_KEY = "tarot:guest-device-token:v1";
const GUEST_CONSUMED_KEY = "tarot:guest-once-consumed:v1";

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
  if (error) throw error;
  return data as { interpretation: string; model: string; guest_consumed: boolean };
}
