import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import Hero from "@/components/Hero";
import TarotSpread, { type TarotInitialReading } from "@/components/TarotSpread";
import { UserMenu } from "@/components/UserMenu";
import { SiteNavBar } from "@/components/SiteNavBar";
import SEO from "@/components/SEO";
import { ConversionChooseSpread } from "@/components/conversion/ConversionChooseSpread";
import { ConversionLoading } from "@/components/conversion/ConversionLoading";
import { ConversionCardPreview } from "@/components/conversion/ConversionCardPreview";
import { spreadTypes, type SpreadType } from "@/data/spreadTypes";
import type { DealtTarotCard } from "@/data/tarotCards";
import type { QuickSpreadChoice } from "@/lib/inferSpreadFromQuestion";
import { drawReadingCards } from "@/lib/shuffleDeck";
import { allCards } from "@/data/tarotCards";
import { PENDING_GUEST_QUESTION_KEY } from "@/lib/guestOnce";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";

type ConversionPhase = "hero" | "choose" | "loading" | "preview" | "reading";

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const [phase, setPhase] = useState<ConversionPhase>("hero");
  const [question, setQuestion] = useState("");
  const [pendingDeal, setPendingDeal] = useState<{
    spread: SpreadType;
    cards: DealtTarotCard[];
  } | null>(null);
  const [spreadSession, setSpreadSession] = useState<TarotInitialReading | null>(null);
  const [readingKey, setReadingKey] = useState(0);

  /** Ao sair da conta, volta ao início da home (funil + tiragem limpos). */
  useEffect(() => {
    if (authLoading) return;
    const uid = user?.id ?? null;
    const prev = prevUserIdRef.current;
    if (prev !== undefined && prev !== null && uid === null) {
      setPhase("hero");
      setQuestion("");
      setPendingDeal(null);
      setSpreadSession(null);
      setReadingKey((k) => k + 1);
      try {
        sessionStorage.removeItem(PENDING_GUEST_QUESTION_KEY);
      } catch {
        /* ignore */
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
      trackEvent("home_reset_after_sign_out");
    }
    prevUserIdRef.current = uid;
  }, [user, authLoading]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Tarot Místico",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    inLanguage: "pt-BR",
    description:
      "Leitura de tarot online com baralho completo de 78 cartas e interpretações por IA para autoconhecimento.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
    },
  };

  const goToReadingArea = (session: TarotInitialReading | null) => {
    setSpreadSession(session);
    setReadingKey((k) => k + 1);
    setPhase("reading");
    window.setTimeout(() => {
      document.getElementById("leitura")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const handleDiscover = (q: string) => {
    setQuestion(q);
    try {
      if (q) sessionStorage.setItem(PENDING_GUEST_QUESTION_KEY, q);
    } catch {
      /* ignore */
    }
    setPhase("choose");
    trackEvent("conversion_hero_cta", { has_question: q.length > 0 });
  };

  const handleChooseContinue = (choice: QuickSpreadChoice) => {
    const spread = spreadTypes.find((s) => s.id === choice);
    if (!spread) return;
    const cards = drawReadingCards(allCards, spread.cardCount);
    setPendingDeal({ spread, cards });
    setPhase("loading");
    trackEvent("conversion_choose_continue", { spread_id: choice });
  };

  const handleLoadingDone = useCallback(() => {
    setPhase("preview");
  }, []);

  const handleSeeMeaning = () => {
    if (!pendingDeal?.cards.length) return;
    const { spread, cards } = pendingDeal;

    try {
      sessionStorage.setItem(PENDING_GUEST_QUESTION_KEY, question.trim());
    } catch {
      /* ignore */
    }

    const revealed = cards.map((_, i) => i === 0);
    trackEvent("conversion_preview_to_reading", { spread_id: spread.id, card_count: cards.length });
    goToReadingArea({ spread, cards, revealed });
  };

  /** Acesso direto ao seletor completo (Cruz Celta etc.), sem o funil. */
  const skipToCatalog = () => {
    trackEvent("conversion_skip_to_catalog");
    goToReadingArea(null);
  };

  const showReading = phase === "reading";

  return (
    <>
      <SEO
        title="Tarot Místico - Leitura de Tarot Online com IA"
        description="Leituras com baralho completo (78 cartas), quatro tipos de tiragem e interpretação por IA."
        path="/"
        jsonLd={jsonLd}
      />
      <div className="min-h-screen bg-background">
        <SiteNavBar>
          <Link
            to="/diario"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/80 backdrop-blur border border-border hover:border-primary/40 text-primary transition-all font-display text-xs tracking-wider uppercase"
          >
            <BookOpen className="w-4 h-4" />
            Diário
          </Link>
          <UserMenu />
        </SiteNavBar>

        {phase === "hero" && <Hero onDiscover={handleDiscover} onOpenFullCatalog={skipToCatalog} />}
        {phase === "choose" && (
          <ConversionChooseSpread
            question={question}
            onBack={() => setPhase("hero")}
            onContinue={handleChooseContinue}
          />
        )}

        {phase === "loading" && <ConversionLoading onDone={handleLoadingDone} />}

        {phase === "preview" && pendingDeal?.cards[0] && (
          <ConversionCardPreview card={pendingDeal.cards[0]} onSeeMeaning={handleSeeMeaning} />
        )}

        {showReading && (
          <div id="leitura">
            <TarotSpread key={readingKey} initialReading={spreadSession} />
          </div>
        )}

        <footer id="avisos-importantes" className="mt-8 py-5 px-4 text-center border-t border-border/50 scroll-mt-24">
          <p className="font-display text-xs tracking-[0.3em] uppercase text-muted-foreground">
            ✧ Tarot Místico ✧
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground/90 mt-2 max-w-2xl mx-auto font-body leading-snug">
            Entretenimento e reflexão — não substitui orientação profissional (saúde, jurídica, financeira ou psicológica).
          </p>
          <details className="mt-4 max-w-2xl mx-auto text-left">
            <summary className="text-xs font-body text-primary cursor-pointer list-none text-center [&::-webkit-details-marker]:hidden">
              <span className="underline underline-offset-2">Avisos importantes (completo)</span>
            </summary>
            <div className="mt-3 text-[11px] text-muted-foreground font-body leading-relaxed space-y-3 border border-border/50 rounded-lg p-3 bg-muted/20">
              <p>
                As leituras e textos por IA são entretenimento e reflexão pessoal. Não leve os resultados como verdade
                absoluta nem como decisão médica, jurídica, financeira ou psicológica. Não nos responsabilizamos por
                decisões ou consequências do uso deste conteúdo.
              </p>
              <p>
                Não processamos pedidos sobre autoferimento, violência a pessoas ou atos ilegais — procure ajuda
                profissional ou emergência se precisar. No Brasil, apoio emocional: CVV 188.
              </p>
              <p>
                A IA não faz diagnóstico médico, não confirma gravidez e não prevê morte com certeza ou prazo. Use como
                reflexão, nunca como substituto de orientação profissional.
              </p>
            </div>
          </details>
        </footer>
      </div>
    </>
  );
};

export default Index;
