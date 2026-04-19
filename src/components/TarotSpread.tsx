import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { allCards, type DealtTarotCard } from "@/data/tarotCards";
import { drawReadingCards } from "@/lib/shuffleDeck";
import { spreadTypes, SpreadType } from "@/data/spreadTypes";
import { saveDiaryEntry } from "@/lib/diary";
import { commitReadingConsult } from "@/lib/readingConsult";
import { trackEvent } from "@/lib/analytics";
import { CTA_CONTINUE_READING, CTA_DISCOVER_MY_ANSWER } from "@/lib/ctaCopy";
import {
  GUEST_DEVICE_LIMIT_AFTER,
  GUEST_DEVICE_LIMIT_AFTER_LINES,
  GUEST_DEVICE_LIMIT_BEFORE,
  hasGuestOnceBeenConsumedLocally,
} from "@/lib/guestOnce";
import { useAuth } from "@/contexts/AuthContext";
import { useIsNarrowViewport } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save } from "lucide-react";
import TarotCardComponent from "./TarotCard";
import SpreadSelector from "./SpreadSelector";
import AIInterpretation from "./AIInterpretation";
import { toast } from "sonner";

const READING_PROGRESS_KEY = "tarot:reading-progress:v1";

interface PersistedReadingProgress {
  spreadId: string;
  cards: DealtTarotCard[];
  revealed: boolean[];
  hasStarted: boolean;
  readingDedupeKey: string | null;
  consultationId: string | null;
  consultUsedCredit: boolean | null;
  consultWelcomeFreeAi: boolean;
  consultCommitError: string | null;
  question: string;
}

function readPersistedReadingProgress(): PersistedReadingProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(READING_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedReadingProgress>;
    if (
      !parsed ||
      typeof parsed.spreadId !== "string" ||
      !Array.isArray(parsed.cards) ||
      !Array.isArray(parsed.revealed) ||
      typeof parsed.hasStarted !== "boolean"
    ) {
      return null;
    }
    if (parsed.cards.length === 0 || parsed.revealed.length !== parsed.cards.length) {
      return null;
    }
    return {
      spreadId: parsed.spreadId,
      cards: parsed.cards as DealtTarotCard[],
      revealed: parsed.revealed as boolean[],
      hasStarted: parsed.hasStarted,
      readingDedupeKey: typeof parsed.readingDedupeKey === "string" ? parsed.readingDedupeKey : null,
      consultationId: typeof parsed.consultationId === "string" ? parsed.consultationId : null,
      consultUsedCredit: typeof parsed.consultUsedCredit === "boolean" ? parsed.consultUsedCredit : null,
      consultWelcomeFreeAi: parsed.consultWelcomeFreeAi === true,
      consultCommitError: typeof parsed.consultCommitError === "string" ? parsed.consultCommitError : null,
      question: typeof parsed.question === "string" ? parsed.question : "",
    };
  } catch {
    return null;
  }
}

function clearPersistedReadingProgress() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(READING_PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

function suitLabelPt(suit: NonNullable<DealtTarotCard["suit"]>): string {
  const labels = { cups: "Copas", swords: "Espadas", pentacles: "Ouros", wands: "Paus" } as const;
  return labels[suit];
}

function CardDetailBody({ card }: { card: DealtTarotCard }) {
  const active = card.isReversed ? card.reversed : card.meaning;
  const passive = card.isReversed ? card.meaning : card.reversed;
  const passiveLabel = card.isReversed ? "Se estivesse direita" : "Se estivesse invertida";

  return (
    <>
      {card.isReversed && (
        <p className="text-xs font-display tracking-wider uppercase text-destructive/90 mb-2 text-left">
          Carta invertida
        </p>
      )}
      {card.arcana === "minor" && card.suit && (
        <p className="text-xs text-muted-foreground mb-2 text-left">
          Arcano menor · Naipe: {suitLabelPt(card.suit)}
        </p>
      )}
      <p className="text-foreground/80 font-body text-base md:text-lg leading-relaxed mb-3 text-left">
        {card.description}
      </p>
      <div className="flex flex-col gap-2 text-sm text-left">
        <p>
          <span className="text-primary font-semibold">Leitura nesta posição:</span>{" "}
          <span className="text-foreground/70">{active}</span>
        </p>
        <p>
          <span className="text-muted-foreground font-semibold">{passiveLabel}:</span>{" "}
          <span className="text-foreground/60">{passive}</span>
        </p>
      </div>
    </>
  );
}

const dealSpread = (count: number): DealtTarotCard[] => drawReadingCards(allCards, count);

/** Sessão já sorteada (ex.: funil de conversão). */
export interface TarotInitialReading {
  spread: SpreadType;
  cards: DealtTarotCard[];
  revealed: boolean[];
}

interface TarotSpreadProps {
  /** Quando definido na montagem, inicia a tiragem com cartas já sorteadas (ex.: após pré-visualização). */
  initialReading?: TarotInitialReading | null;
}

const TarotSpread = ({ initialReading = null }: TarotSpreadProps) => {
  const persistedProgress = initialReading ? null : readPersistedReadingProgress();
  const persistedSpread =
    persistedProgress && persistedProgress.hasStarted
      ? spreadTypes.find((s) => s.id === persistedProgress.spreadId) ?? null
      : null;

  const { user, openAuthDialog, refreshAiQuota, isLoading: authLoading, aiQuota } = useAuth();
  const isNarrow = useIsNarrowViewport();
  const [fromConversionFunnel, setFromConversionFunnel] = useState(() => !!initialReading);
  const [selectedSpread, setSelectedSpread] = useState<SpreadType | null>(
    () => initialReading?.spread ?? persistedSpread ?? null
  );
  const [cards, setCards] = useState<DealtTarotCard[]>(
    () => initialReading?.cards ?? persistedProgress?.cards ?? []
  );
  const [revealed, setRevealed] = useState<boolean[]>(
    () => initialReading?.revealed ?? persistedProgress?.revealed ?? []
  );
  const [hasStarted, setHasStarted] = useState(() => !!initialReading || persistedProgress?.hasStarted === true);
  const [selectedCard, setSelectedCard] = useState<DealtTarotCard | null>(() => {
    const sourceRevealed = initialReading?.revealed ?? persistedProgress?.revealed ?? [];
    const sourceCards = initialReading?.cards ?? persistedProgress?.cards ?? [];
    const firstRevealedIdx = sourceRevealed.findIndex(Boolean);
    if (firstRevealedIdx < 0) return null;
    return sourceCards[firstRevealedIdx] ?? null;
  });
  const [readingDedupeKey, setReadingDedupeKey] = useState<string | null>(() =>
    initialReading ? crypto.randomUUID() : (persistedProgress?.readingDedupeKey ?? null)
  );
  const [consultationId, setConsultationId] = useState<string | null>(persistedProgress?.consultationId ?? null);
  const [consultUsedCredit, setConsultUsedCredit] = useState<boolean | null>(
    persistedProgress?.consultUsedCredit ?? null
  );
  const [consultWelcomeFreeAi, setConsultWelcomeFreeAi] = useState(
    persistedProgress?.consultWelcomeFreeAi === true
  );
  const [consultCommitLoading, setConsultCommitLoading] = useState(false);
  const [consultCommitError, setConsultCommitError] = useState<string | null>(
    persistedProgress?.consultCommitError ?? null
  );
  const [savedQuestion, setSavedQuestion] = useState<string>(persistedProgress?.question ?? "");
  const firstCardAnchorRef = useRef<HTMLDivElement | null>(null);

  /** Só quando já temos quota carregada; se ainda for null, o servidor valida no registo da consulta. */
  const quotaExhausted =
    !!user &&
    aiQuota != null &&
    aiQuota.free_remaining_today < 1 &&
    aiQuota.credits_balance < 1;

  const startReading = useCallback(() => {
    if (!selectedSpread) return;
    if (authLoading) return;
    setFromConversionFunnel(false);
    const selected = dealSpread(selectedSpread.cardCount);
    trackEvent("reading_started", {
      spread_id: selectedSpread.id,
      spread_name: selectedSpread.name,
      card_count: selectedSpread.cardCount,
    });
    const n = selectedSpread.cardCount;
    setReadingDedupeKey(crypto.randomUUID());
    setConsultationId(null);
    setConsultUsedCredit(null);
    setConsultWelcomeFreeAi(false);
    setConsultCommitError(null);
    setCards(selected);
    setRevealed(new Array(n).fill(false));
    setHasStarted(true);
    setSelectedCard(null);
    setSavedQuestion("");
  }, [selectedSpread, authLoading]);

  useEffect(() => {
    if (!hasStarted || cards.length === 0) return;
    const id = window.setTimeout(() => {
      firstCardAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
    return () => window.clearTimeout(id);
  }, [hasStarted, cards]);

  useEffect(() => {
    if (user && selectedSpread && !hasStarted) {
      void refreshAiQuota();
    }
  }, [user, selectedSpread, hasStarted, refreshAiQuota]);

  const revealCard = (index: number) => {
    setRevealed((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    setSelectedCard(cards[index]);
  };

  const resetAll = (opts?: { announceReplace?: boolean }) => {
    setFromConversionFunnel(false);
    setSelectedSpread(null);
    setCards([]);
    setRevealed([]);
    setHasStarted(false);
    setSelectedCard(null);
    setReadingDedupeKey(null);
    setConsultationId(null);
    setConsultUsedCredit(null);
    setConsultWelcomeFreeAi(false);
    setConsultCommitError(null);
    setConsultCommitLoading(false);
    setSavedQuestion("");
    clearPersistedReadingProgress();
    if (opts?.announceReplace) {
      toast.message("Você começou uma nova leitura. A anterior foi substituída.");
    }
  };

  const handleSwitchSpreadWithConfirm = () => {
    const ok = window.confirm(
      "Você já começou uma leitura e vai perder o progresso atual. Deseja trocar de tiragem mesmo assim?"
    );
    if (!ok) return;
    resetAll({ announceReplace: true });
  };

  const allRevealed = revealed.length > 0 && revealed.every(Boolean);

  /** Alinha GA com o backend: só após revelar todas as cartas (antes da IA / commit). */
  useEffect(() => {
    if (!allRevealed || !hasStarted || !selectedSpread || cards.length === 0 || !readingDedupeKey) return;
    trackEvent("reading_all_cards_revealed", {
      spread_id: selectedSpread.id,
      spread_name: selectedSpread.name,
      card_count: cards.length,
      is_guest: !user,
    });
  }, [allRevealed, hasStarted, selectedSpread, cards.length, readingDedupeKey, user]);

  useEffect(() => {
    if (!allRevealed || !user || !selectedSpread || !readingDedupeKey || cards.length === 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setConsultCommitLoading(true);
      setConsultCommitError(null);
      try {
        const res = await commitReadingConsult({
          dedupeKey: readingDedupeKey,
          spreadId: selectedSpread.id,
          spreadName: selectedSpread.name,
          cards,
        });
        if (cancelled) return;
        setConsultationId(res.consultation_id);
        setConsultUsedCredit(res.used_credit);
        setConsultWelcomeFreeAi(res.welcome_free_ai === true);
        trackEvent("consultation_committed", {
          used_credit: res.used_credit,
          welcome_free_ai: res.welcome_free_ai === true,
          free_remaining_today: res.free_remaining_today,
        });
        await refreshAiQuota();
      } catch (err) {
        if (cancelled) return;
        const e = err as Error & { code?: string };
        if (e.code === "QUOTA_EXCEEDED") {
          trackEvent("consultation_commit_quota_exceeded");
          setConsultCommitError(
            e.message ||
              "✨ Há mais nessa leitura...\n\nDesbloqueie a interpretação completa e descubra todos os detalhes."
          );
        } else {
          trackEvent("consultation_commit_failed");
          setConsultCommitError(e instanceof Error ? e.message : "Não foi possível registar a consulta.");
        }
        setConsultationId(null);
        setConsultUsedCredit(null);
        setConsultWelcomeFreeAi(false);
      } finally {
        if (!cancelled) setConsultCommitLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allRevealed, user, selectedSpread, readingDedupeKey, cards, refreshAiQuota]);

  useEffect(() => {
    if (!hasStarted || !selectedSpread || cards.length === 0) {
      clearPersistedReadingProgress();
      return;
    }
    const payload: PersistedReadingProgress = {
      spreadId: selectedSpread.id,
      cards,
      revealed,
      hasStarted,
      readingDedupeKey,
      consultationId,
      consultUsedCredit,
      consultWelcomeFreeAi,
      consultCommitError,
      question: savedQuestion,
    };
    try {
      window.sessionStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [
    hasStarted,
    selectedSpread,
    cards,
    revealed,
    readingDedupeKey,
    consultationId,
    consultUsedCredit,
    consultWelcomeFreeAi,
    consultCommitError,
    savedQuestion,
  ]);

  const saveReading = async () => {
    if (!selectedSpread) return;
    if (!user) {
      openAuthDialog("Inicie sessão para guardar esta leitura no diário e rever quando quiser.");
      return;
    }
    const saved = await saveDiaryEntry(user.id, {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      spreadName: selectedSpread.name,
      spreadEmoji: "",
      labels: selectedSpread.labels,
      cards,
      note: "",
    });
    if (saved) {
      toast.success("Leitura guardada no diário.");
    } else {
      toast.error("Não foi possível guardar. Tente novamente.");
    }
  };

  const getGridClass = () => {
    if (!selectedSpread) return "";
    switch (selectedSpread.id) {
      case "yes-no":
        return "flex justify-center";
      case "past-present-future":
        return "flex flex-wrap justify-center gap-6 md:gap-10";
      case "love":
        return "flex flex-wrap justify-center gap-4 md:gap-8";
      case "celtic-cross":
        return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 justify-items-center";
      default:
        return "flex flex-wrap justify-center gap-6 md:gap-10";
    }
  };

  return (
    <section className={cn("py-16 px-4", isNarrow && hasStarted && "pb-28")}>
      <div className="max-w-6xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-display text-3xl md:text-4xl text-gold-gradient mb-3"
        >
          Sua leitura
        </motion.h2>
        <p className="text-muted-foreground font-body text-sm md:text-base mb-2 max-w-lg mx-auto leading-relaxed">
          {fromConversionFunnel ? (
            selectedSpread && selectedSpread.cardCount === 1 ? (
              <>
                Sua carta está na mesa — revele-a e, ao final, use{" "}
                <span className="text-foreground/90 font-medium">{CTA_DISCOVER_MY_ANSWER}</span>.
              </>
            ) : (
              <>
                Toque nas outras cartas para seguir a tiragem — ao final, use{" "}
                <span className="text-foreground/90 font-medium">{CTA_DISCOVER_MY_ANSWER}</span>.
              </>
            )
          ) : (
            <>
              <span className="text-foreground/90 font-medium">1.</span> Escolha a tiragem ·{" "}
              <span className="text-foreground/90 font-medium">2.</span> Revele cada carta ·{" "}
              <span className="text-foreground/90 font-medium">3.</span> {CTA_DISCOVER_MY_ANSWER}
            </>
          )}
        </p>

        {!hasStarted ? (
          <>
            <SpreadSelector onSelect={setSelectedSpread} selected={selectedSpread} />
            <AnimatePresence>
              {selectedSpread && (
                <div className="flex flex-col items-center gap-3">
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    whileHover={{ scale: authLoading ? 1 : 1.05 }}
                    whileTap={{ scale: authLoading ? 1 : 0.95 }}
                    onClick={startReading}
                    disabled={authLoading}
                    className="font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-primary text-primary-foreground glow-gold transition-all hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {`✦ Iniciar ${selectedSpread.name} ✦`}
                  </motion.button>
                  {!user && selectedSpread && !hasStarted && (
                    <p className="text-center text-xs sm:text-sm text-muted-foreground font-body max-w-sm px-2 leading-relaxed">
                      {hasGuestOnceBeenConsumedLocally() ? (
                        <span className="text-foreground/90">
                          <span className="font-medium">{GUEST_DEVICE_LIMIT_AFTER_LINES[0]}</span>
                          {" · "}
                          {GUEST_DEVICE_LIMIT_AFTER_LINES[1]}
                        </span>
                      ) : (
                        <span className="text-foreground/90">{GUEST_DEVICE_LIMIT_BEFORE}</span>
                      )}
                    </p>
                  )}
                  {user && quotaExhausted && (
                    <p className="text-xs text-muted-foreground font-body max-w-sm px-2">
                      Você pode continuar a tiragem normalmente. A interpretação completa com IA será liberada após ter
                      saldo ou crédito.{" "}
                      <Link to="/creditos" className="text-primary underline underline-offset-2">
                        Ver opções
                      </Link>{" "}
                      para desbloquear.
                    </p>
                  )}
                </div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <>
            {!allRevealed && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleSwitchSpreadWithConfirm}
                  className="text-xs md:text-sm font-body text-muted-foreground underline underline-offset-4 hover:text-primary transition-colors"
                >
                  Trocar tiragem (reinicia esta leitura)
                </button>
              </div>
            )}
            {selectedSpread && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-display text-sm tracking-[0.2em] uppercase text-primary/70 mb-8"
              >
                {selectedSpread.name}
              </motion.p>
            )}

            <div className={`${getGridClass()} mb-12`}>
              {cards.map((card, i) => (
                <div
                  key={`slot-${card.id}-${i}`}
                  ref={i === 0 ? firstCardAnchorRef : undefined}
                  className={i === 0 ? "scroll-mt-28" : undefined}
                >
                  <TarotCardComponent
                    card={card}
                    isReversed={card.isReversed}
                    label={selectedSpread?.labels[i] || ""}
                    isRevealed={revealed[i]}
                    onReveal={() => revealCard(i)}
                    delay={i * 0.15}
                  />
                </div>
              ))}
            </div>

            {/* Mobile: detalhe da carta em drawer (bottom sheet) */}
            <Drawer
              open={isNarrow && !!selectedCard}
              onOpenChange={(open) => {
                if (!open) setSelectedCard(null);
              }}
            >
              <DrawerContent className="max-h-[85vh] flex flex-col">
                {selectedCard && (
                  <>
                    <DrawerHeader className="relative text-left pb-2 pr-14">
                      <DrawerClose asChild>
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
                        >
                          Fechar
                        </button>
                      </DrawerClose>
                      <DrawerTitle className="font-display text-lg text-primary pr-2">
                        {selectedCard.name}
                        {selectedCard.isReversed ? " · invertida" : ""}
                      </DrawerTitle>
                      <DrawerDescription className="text-xs text-muted-foreground font-body">
                        {selectedCard.nameEn}
                      </DrawerDescription>
                    </DrawerHeader>
                    <div className="overflow-y-auto px-4 pb-8 pt-0">
                      <CardDetailBody card={selectedCard} />
                    </div>
                  </>
                )}
              </DrawerContent>
            </Drawer>

            {/* Desktop: significado completo em modal (evita texto “lá em baixo” fora da vista) */}
            <Dialog
              open={!isNarrow && !!selectedCard}
              onOpenChange={(open) => {
                if (!open) setSelectedCard(null);
              }}
            >
              <DialogContent className="flex max-h-[min(88vh,720px)] w-[min(100vw-1.5rem,32rem)] max-w-lg flex-col gap-0 overflow-hidden border-border bg-card p-0 sm:rounded-xl">
                {selectedCard && (
                  <>
                    <DialogHeader className="shrink-0 border-b border-border/70 p-6 pb-3 pr-14 text-left">
                      <DialogTitle className="font-display text-xl text-primary">
                        {selectedCard.name}
                        {selectedCard.isReversed ? " · invertida" : ""}
                      </DialogTitle>
                      <DialogDescription className="font-body text-xs italic text-muted-foreground">
                        {selectedCard.nameEn}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-4">
                      <CardDetailBody card={selectedCard} />
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>

            {allRevealed && selectedSpread && (
              <AIInterpretation
                spreadId={selectedSpread.id}
                spreadName={selectedSpread.name}
                labels={selectedSpread.labels}
                cards={cards}
                consultationId={consultationId}
                consultCommitLoading={consultCommitLoading}
                consultCommitError={consultCommitError}
                guestMode={!user}
                initialQuestion={savedQuestion}
                onQuestionChange={setSavedQuestion}
                onGuestConsumed={() => {
                  trackEvent("guest_first_reading_completed");
                  const [title, ...rest] = GUEST_DEVICE_LIMIT_AFTER.split(/\n+/).filter(Boolean);
                  toast.message(title, { description: rest.join(" ") || undefined });
                }}
              />
            )}

            {allRevealed && (
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={saveReading}
                  className="font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-primary text-primary-foreground glow-gold hover:brightness-110 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar no Diário
                </motion.button>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => resetAll({ announceReplace: true })}
                  className="font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
                >
                  {CTA_CONTINUE_READING}
                </motion.button>
              </div>
            )}
          </>
        )}
      </div>

      {isNarrow && hasStarted && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="pointer-events-auto mx-auto max-w-lg">
            {!allRevealed ? (
              <p className="text-center text-xs text-muted-foreground font-body">
                Toque em cada carta para revelar
              </p>
            ) : (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("bloco-interpretacao-ia")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="w-full font-display tracking-[0.12em] uppercase text-sm px-6 py-3.5 rounded-lg bg-primary text-primary-foreground glow-gold hover:brightness-110 transition-all"
              >
                {CTA_DISCOVER_MY_ANSWER}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default TarotSpread;
