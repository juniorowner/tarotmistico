import { Link } from "react-router-dom";
import { Sparkles, Gift, ArrowRight } from "lucide-react";
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
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-display uppercase tracking-widest text-primary">
            <Gift className="h-3.5 w-3.5" />
            Boas-vindas
          </p>

          <h1 className="mt-6 font-display text-3xl md:text-5xl text-gold-gradient">
            Conta ativa com créditos liberados
          </h1>

          <p className="mt-4 text-muted-foreground font-body text-base md:text-lg leading-relaxed">
            Você ganhou <strong className="text-foreground">1 crédito grátis por dia</strong> para usar nas suas consultas.
          </p>

          <div className="mt-8 rounded-xl border border-primary/20 bg-card/70 p-6 text-left">
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              <Sparkles className="mr-2 inline h-4 w-4 text-primary align-text-bottom" />
              Dica: faça uma tiragem completa e gere sua interpretação por IA para aproveitar agora os créditos da conta.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-display text-xs uppercase tracking-wider text-primary-foreground transition-all hover:brightness-110"
            >
              Começar leitura agora
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/creditos"
              className="inline-flex items-center gap-2 rounded-lg border border-primary/35 px-6 py-3 font-display text-xs uppercase tracking-wider text-primary transition-all hover:bg-primary/10"
            >
              Ver créditos
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BoasVindasCreditos;
