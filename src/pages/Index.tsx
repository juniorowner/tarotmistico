import { Link } from "react-router-dom";
import { BookOpen, Sparkles } from "lucide-react";
import Hero from "@/components/Hero";
import TarotSpread from "@/components/TarotSpread";
import { UserMenu } from "@/components/UserMenu";
import { SiteNavBar } from "@/components/SiteNavBar";
import SEO from "@/components/SEO";

const Index = () => {
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
          <Link
            to="/creditos"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/80 backdrop-blur border border-border hover:border-primary/40 text-primary transition-all font-display text-xs tracking-wider uppercase"
          >
            <Sparkles className="w-4 h-4" />
            Créditos
          </Link>
          <UserMenu />
        </SiteNavBar>
        <Hero />
        <div id="leitura">
          <TarotSpread />
        </div>
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
