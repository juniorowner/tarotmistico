import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteNavBar } from "@/components/SiteNavBar";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAiQuota, type AiQuotaResponse } from "@/lib/aiQuota";
import { Button } from "@/components/ui/button";
import { CTA_CONTINUE_READING, CTA_DISCOVER_MY_ANSWER } from "@/lib/ctaCopy";

type QuotaState = { status: "loading" } | { status: "error" } | { status: "ok"; data: AiQuotaResponse };

const BoasVindasCreditos = () => {
  const { user, isLoading: authLoading, friendlyName } = useAuth();
  const [quotaState, setQuotaState] = useState<QuotaState>({ status: "loading" });

  const loadQuota = useCallback(() => {
    if (!user) return;
    setQuotaState({ status: "loading" });
    void fetchAiQuota().then((q) => {
      if (q) setQuotaState({ status: "ok", data: q });
      else setQuotaState({ status: "error" });
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadQuota();
  }, [user, loadQuota]);

  if (!authLoading && !user) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || (user && quotaState.status === "loading")) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNavBar>
          <UserMenu />
        </SiteNavBar>
        <section className="px-4 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-muted-foreground font-body text-sm">A carregar…</p>
          </div>
        </section>
      </div>
    );
  }

  if (quotaState.status === "error") {
    return (
      <div className="min-h-screen bg-background">
        <SiteNavBar>
          <UserMenu />
        </SiteNavBar>
        <section className="px-4 py-16">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <p className="text-muted-foreground font-body text-sm">
              Não foi possível verificar o estado da sua conta. Tente de novo.
            </p>
            <Button type="button" variant="secondary" onClick={loadQuota}>
              Tentar novamente
            </Button>
            <div>
              <Link to="/" className="text-primary text-sm underline underline-offset-2">
                Ir para o início
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const hasWelcomeFree = quotaState.data.free_remaining_today > 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteNavBar>
        <UserMenu />
      </SiteNavBar>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          {hasWelcomeFree ? (
            <>
              <p className="text-sm text-primary/90 font-body mb-3">Olá, {friendlyName}</p>
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
                  {CTA_DISCOVER_MY_ANSWER}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl md:text-5xl text-gold-gradient leading-tight">
                ✨ Ainda há mais para descobrir
              </h1>

              <p className="mt-6 text-muted-foreground font-body text-base md:text-lg leading-relaxed">
                Sua primeira leitura já revelou algo importante…
              </p>

              <p className="mt-3 text-foreground/90 font-body text-base md:text-lg leading-relaxed">
                Agora você pode continuar e aprofundar sua resposta.
              </p>

              <div className="mt-10 flex justify-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3.5 font-display text-[11px] sm:text-xs uppercase tracking-[0.18em] text-primary-foreground transition-all hover:brightness-110"
                >
                  {CTA_CONTINUE_READING}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default BoasVindasCreditos;
