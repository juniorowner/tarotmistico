import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { allCards, type DealtTarotCard } from "@/data/tarotCards";
import { drawReadingCards } from "@/lib/shuffleDeck";
import { SpreadType } from "@/data/spreadTypes";
import { saveDiaryEntry } from "@/lib/diary";
import { commitReadingConsult } from "@/lib/readingConsult";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { useIsNarrowViewport } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
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
import { hasGuestOnceBeenConsumedLocally, markGuestOnceConsumedLocally } from "@/lib/guestOnce";

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

const TarotSpread = () => {
  const navigate = useNavigate();
  const { user, openAuthDialog, refreshAiQuota, isLoading: authLoading, aiQuota } = useAuth();
  const isNarrow = useIsNarrowViewport();
  const [selectedSpread, setSelectedSpread] = useState<SpreadType | null>(null);
  const [cards, setCards] = useState<DealtTarotCard[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedCard, setSelectedCard] = useState<DealtTarotCard | null>(null);
  const [readingDedupeKey, setReadingDedupeKey] = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [consultUsedCredit, setConsultUsedCredit] = useState<boolean | null>(null);
  const [consultWelcomeFreeAi, setConsultWelcomeFreeAi] = useState(false);
  const [consultCommitLoading, setConsultCommitLoading] = useState(false);
  const [consultCommitError, setConsultCommitError] = useState<string | null>(null);
  const [guestReadingAlreadyUsed, setGuestReadingAlreadyUsed] = useState(hasGuestOnceBeenConsumedLocally);
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
    if (!user) {
      if (guestReadingAlreadyUsed) {
        trackEvent("auth_required_start_reading_after_guest");
        openAuthDialog(
          "Sua consulta grátis sem login já foi usada neste dispositivo. Entre ou crie conta para continuar com novas leituras."
        );
        return;
      }
    }
    if (quotaExhausted) {
      trackEvent("reading_start_blocked_quota");
      toast.error("Sem consultas grátis hoje e sem créditos. Redirecionando para créditos…");
      void navigate("/creditos");
      return;
    }
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
  }, [selectedSpread, user, authLoading, openAuthDialog, quotaExhausted, guestReadingAlreadyUsed, navigate]);

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

  const resetAll = () => {
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
              "Limite de consultas grátis hoje atingido. Compre créditos ou volte amanhã."
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

  const saveReading = async () => {
    if (!selectedSpread) return;
    if (!user) {
      openAuthDialog(
        "Para guardar no diário, inicie sessão. As leituras ficam na sua conta. Você tem 1 interpretação por IA grátis por dia; depois pode usar créditos."
      );
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
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-display text-3xl md:text-4xl text-gold-gradient mb-4"
        >
          Sua Leitura
        </motion.h2>
        <p className="text-muted-foreground font-body text-lg mb-6 max-w-md mx-auto">
          Escolha o tipo de leitura, concentre-se em sua pergunta e revele as cartas.
        </p>

        <div className="max-w-2xl mx-auto mb-10 rounded-lg border border-border/60 bg-muted/15 px-4 py-3 text-left">
          <p className="font-display text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
            Aviso
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed font-body">
            As leituras e a interpretação por IA são apenas entretenimento e reflexão pessoal. Não leve os resultados como
            verdade absoluta nem como orientação profissional (saúde, jurídica, financeira ou psicológica). Não nos
            responsabilizamos por decisões ou consequências decorrentes do uso deste conteúdo.
          </p>
        </div>

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
                    whileHover={{ scale: authLoading || quotaExhausted ? 1 : 1.05 }}
                    whileTap={{ scale: authLoading || quotaExhausted ? 1 : 0.95 }}
                    onClick={startReading}
                    disabled={authLoading || quotaExhausted}
                    className="font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-primary text-primary-foreground glow-gold transition-all hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {`✦ Iniciar ${selectedSpread.name} ✦`}
                  </motion.button>
                  {!user && guestReadingAlreadyUsed && (
                    <p className="text-xs text-muted-foreground font-body max-w-sm px-2">
                      A consulta gratuita sem login neste dispositivo já foi usada.{" "}
                      <button
                        type="button"
                        onClick={() =>
                          openAuthDialog("Entre ou crie conta para continuar com novas leituras.")
                        }
                        className="text-primary underline underline-offset-2"
                      >
                        Entrar ou criar conta
                      </button>
                      .
                    </p>
                  )}
                  {user && quotaExhausted && (
                    <p className="text-xs text-muted-foreground font-body max-w-sm px-2">
                      Sem consultas grátis hoje e sem créditos.{" "}
                      <Link to="/creditos" className="text-primary underline underline-offset-2">
                        Comprar créditos
                      </Link>{" "}
                      ou volte amanhã (limite diário em UTC).
                    </p>
                  )}
                </div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <>
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
                    <DrawerHeader className="text-left pb-2">
                      <DrawerTitle className="font-display text-lg text-primary">
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
                onGuestConsumed={() => {
                  if (!guestReadingAlreadyUsed) {
                    markGuestOnceConsumedLocally();
                    setGuestReadingAlreadyUsed(true);
                    trackEvent("guest_first_reading_completed");
                    toast.message("Consulta completa grátis concluída.", {
                      description: "Para novas consultas sem crédito, entre ou crie conta.",
                    });
                  }
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
                  onClick={startReading}
                  disabled={authLoading || quotaExhausted}
                  className="font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  Repetir Leitura
                </motion.button>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetAll}
                  className="font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
                >
                  Escolher Outra Leitura
                </motion.button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default TarotSpread;
