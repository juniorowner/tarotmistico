import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteNavBar } from "@/components/SiteNavBar";
import { UserMenu } from "@/components/UserMenu";

const BoasVindasCreditos = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteNavBar>
        <UserMenu />
      </SiteNavBar>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-3xl md:text-5xl text-gold-gradient leading-tight">
            🔮 Sua leitura já pode ser revelada
          </h1>

          <p className="mt-6 text-muted-foreground font-body text-base md:text-lg leading-relaxed">
            Você ganhou uma interpretação completa com IA gratuita.
          </p>

          <p className="mt-3 text-foreground/90 font-body text-base md:text-lg leading-relaxed">
            Use agora e descubra o que as cartas têm a dizer.
          </p>

          <div className="mt-10 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3.5 font-display text-[11px] sm:text-xs uppercase tracking-[0.18em] text-primary-foreground transition-all hover:brightness-110"
            >
              Descobrir minha resposta
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BoasVindasCreditos;
