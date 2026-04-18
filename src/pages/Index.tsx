import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Sparkles } from "lucide-react";
import Hero from "@/components/Hero";
import TarotSpread, { type TarotInitialReading } from "@/components/TarotSpread";
import { UserMenu } from "@/components/UserMenu";
import { SiteNavBar } from "@/components/SiteNavBar";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
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

type ConversionPhase = "hero" | "choose" | "loading" | "preview" | "reading";

const Index = () => {
  const { user, isLoading } = useAuth();
  const [phase, setPhase] = useState<ConversionPhase>("hero");
  const [question, setQuestion] = useState("");
  const [pendingDeal, setPendingDeal] = useState<{
    spread: SpreadType;
    cards: DealtTarotCard[];
  } | null>(null);
  const [spreadSession, setSpreadSession] = useState<TarotInitialReading | null>(null);
  const [readingKey, setReadingKey] = useState(0);

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
          {!isLoading && user && (
            <Link
              to="/creditos"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/80 backdrop-blur border border-border hover:border-primary/40 text-primary transition-all font-display text-xs tracking-wider uppercase"
            >
              <Sparkles className="w-4 h-4" />
              Créditos
            </Link>
          )}
          <UserMenu />
        </SiteNavBar>

        {phase === "hero" && (
          <>
            <Hero onDiscover={handleDiscover} />
            <div className="text-center px-4 pb-10 -mt-4">
              <button
                type="button"
                onClick={skipToCatalog}
                className="text-sm text-muted-foreground hover:text-primary font-body underline underline-offset-4 transition-colors"
              >
                Ver todas as tiragens (Cruz Celta e outras)
              </button>
            </div>
          </>
        )}
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

        <footer className="py-10 px-4 text-center border-t border-border/50">
          <p className="font-display text-xs tracking-[0.3em] uppercase text-muted-foreground">
            ✧ Tarot Místico ✧
          </p>
          <p className="text-sm text-muted-foreground/90 mt-4 max-w-2xl mx-auto font-body leading-relaxed">
            ⚠️ O Tarot Místico é uma ferramenta de reflexão e autoconhecimento. As leituras servem como guia espiritual e
            não substituem aconselhamento médico, jurídico, financeiro ou profissional. Use sua intuição e
            responsabilidade pessoal ao tomar decisões importantes.
          </p>
        </footer>
      </div>
    </>
  );
};

export default Index;
