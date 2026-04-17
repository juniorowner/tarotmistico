import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { DealtTarotCard } from "@/data/tarotCards";
import { requestAIInterpretation } from "@/lib/ai";
import { markGuestOnceConsumedLocally, requestGuestInterpretationOnce } from "@/lib/guestOnce";
import { trackEvent } from "@/lib/analytics";
import { unsafeUserContentMessage, userQuestionFailsSafetyPolicy } from "@/lib/safetyContent";
import { useAuth } from "@/contexts/AuthContext";

interface AIInterpretationProps {
  spreadId: string;
  spreadName: string;
  labels: string[];
  cards: DealtTarotCard[];
  consultationId: string | null;
  consultCommitLoading: boolean;
  consultCommitError: string | null;
  guestMode?: boolean;
  onGuestConsumed?: () => void;
}

type ErrorFooter = "quota" | "included" | null;

const AIInterpretation = ({
  spreadId,
  spreadName,
  labels,
  cards,
  consultationId,
  consultCommitLoading,
  consultCommitError,
  guestMode = false,
  onGuestConsumed,
}: AIInterpretationProps) => {
  const { user, session, isLoading: authLoading, openAuthDialog, refreshAiQuota, aiQuota } = useAuth();
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorFooter, setErrorFooter] = useState<ErrorFooter>(null);
  const [question, setQuestion] = useState("");
  const [quotaHint, setQuotaHint] = useState<string | null>(null);

  const handleInterpret = async (opts?: { replaceExisting?: boolean }) => {
    if (authLoading) return;
    if (!user && !guestMode) {
      trackEvent("ai_interpretation_auth_required");
      openAuthDialog(
        "Inicie sessão para ver a interpretação por IA. A consulta grátis diária e os créditos contam ao concluir a tiragem (todas as cartas reveladas)."
      );
      return;
    }
    if (!guestMode && (consultCommitLoading || !consultationId)) {
      return;
    }
    if (!guestMode && consultCommitError) {
      return;
    }
    if (userQuestionFailsSafetyPolicy(question)) {
      trackEvent("ai_interpretation_blocked_safety");
      toast.error(unsafeUserContentMessage());
      return;
    }
    trackEvent("ai_interpretation_requested", {
      spread_id: spreadId,
      has_question: question.trim().length > 0,
      replace_existing: opts?.replaceExisting === true,
      guest_mode: guestMode,
    });
    setIsLoading(true);
    setError(null);
    setErrorFooter(null);
    setQuotaHint(null);
    try {
      if (guestMode) {
        const result = await requestGuestInterpretationOnce({
          spreadName,
          labels,
          cards,
          question: question.trim() || undefined,
        });
        setInterpretation(result.interpretation);
        trackEvent("guest_interpretation_success", {
          spread_id: spreadId,
          has_question: question.trim().length > 0,
        });
        markGuestOnceConsumedLocally();
        onGuestConsumed?.();
        setQuotaHint("Consulta completa grátis utilizada neste dispositivo. Nas próximas, faça login.");
      } else {
        const result = await requestAIInterpretation(
          {
            spreadId,
            spreadName,
            labels,
            cards,
            question: question.trim() || undefined,
            consultationId: consultationId as string,
            replaceExisting: opts?.replaceExisting === true,
          },
          { session }
        );
        setInterpretation(result.interpretation);
        trackEvent("ai_interpretation_success", {
          spread_id: spreadId,
          used_credit: result.used_credit ?? null,
        });
        await refreshAiQuota();
        if (result.used_credit) {
          setQuotaHint("Esta consulta usou 1 crédito comprado (contabilizado ao concluir a tiragem).");
        } else if (typeof result.free_remaining_today === "number") {
          setQuotaHint(`Consultas grátis restantes hoje: ${result.free_remaining_today}.`);
        }
      }
    } catch (err) {
      const e = err as Error & { code?: string; credits?: number; hint?: string };
      if (guestMode) {
        if (e.code === "AI_TRUNCATED") {
          trackEvent("guest_interpretation_failed", { spread_id: spreadId, reason: "truncated" });
          setError(
            e.message ||
              "A leitura veio incompleta. Toque em «Gerar interpretação» de novo — a consulta grátis ainda não foi contabilizada neste dispositivo."
          );
          return;
        }
        if (e.code === "GUEST_LOG_FAILED") {
          trackEvent("guest_interpretation_failed", { spread_id: spreadId, reason: "log_failed" });
          setError(
            e.message ||
              "O servidor não conseguiu guardar o registo da consulta. Tente de novo; se persistir, confirme no Supabase a tabela guest_questions e as migrations."
          );
          return;
        }
        if (e.code === "GUEST_ALREADY_USED") {
          trackEvent("guest_interpretation_failed", { spread_id: spreadId, reason: "already_used" });
          onGuestConsumed?.();
          openAuthDialog("A consulta completa grátis deste dispositivo já foi usada. Entre ou crie conta para continuar.");
          setError("A consulta grátis deste dispositivo já foi usada. Faça login para continuar.");
          return;
        }
        trackEvent("guest_interpretation_failed", {
          spread_id: spreadId,
          reason: e.code || "unknown",
        });
        setError(e.message || "Não foi possível concluir a interpretação grátis. Tente de novo ou faça login.");
        return;
      }
      if (e.message === "AUTH_REQUIRED" || e.code === "AUTH_REQUIRED") {
        openAuthDialog(
          "Inicie sessão para ver a interpretação por IA. A consulta grátis diária e os créditos contam ao concluir a tiragem (todas as cartas reveladas)."
        );
        return;
      }
      if (e.code === "AUTH_INVALID") {
        setError(
          e.message ||
            "A sessão com o servidor não é válida. Saia (Sair), entre de novo e tente. Se mudou o projeto Supabase, limpe os dados do site neste domínio."
        );
        setErrorFooter("included");
        return;
      }
      if (e.code === "QUOTA_EXCEEDED") {
        trackEvent("ai_interpretation_quota_exceeded");
        setError(
          e.message ||
            "Limite diário atingido. Compre créditos para continuar hoje ou volte amanhã."
        );
        setErrorFooter("quota");
        return;
      }
      if (e.code === "CONSULTATION_REQUIRED" || e.code === "CONSULTATION_INVALID") {
        setError(
          e.message ||
            "Consulta inválida. Recarregue a página, revele todas as cartas de novo e aguarde o registo da consulta."
        );
        setErrorFooter("included");
        return;
      }
      if (e.code === "CONSULTATION_REVOKED") {
        setError(
          e.message ||
            "Esta consulta foi anulada. Faça uma nova tiragem para gerar outra consulta."
        );
        setErrorFooter("included");
        return;
      }
      if (e.code === "UNSAFE_CONTENT") {
        trackEvent("ai_interpretation_blocked_safety");
        toast.error(e.message || unsafeUserContentMessage());
        return;
      }
      trackEvent("ai_interpretation_failed");
      void refreshAiQuota();
      if (e.hint) {
        toast.message(e.hint);
      }
      setError(e instanceof Error ? e.message : "Erro ao gerar interpretação");
      setErrorFooter("included");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-8"
    >
      {user && (
        <p className="text-xs text-center font-body mb-3 px-2 py-2 rounded-lg bg-primary/10 border border-primary/20 text-foreground/90">
          <Sparkles className="inline w-3.5 h-3.5 text-primary mr-1 align-text-bottom" />
          <strong>{aiQuota?.free_remaining_today ?? 0}</strong> de 1 consulta grátis restante hoje ·{" "}
          <strong>{aiQuota?.credits_balance ?? 0}</strong> créditos comprados ·{" "}
          <Link to="/creditos" className="text-primary underline underline-offset-2 hover:text-primary/80">
            COMPRAR CRÉDITOS
          </Link>
        </p>
      )}
      <p className="text-xs text-center text-muted-foreground font-body mb-4 px-2 leading-relaxed">
        O baralho tem <strong className="text-foreground">78 cartas</strong> (Arcanos Maiores e Menores).{" "}
        Sem login, o dispositivo tem <strong className="text-foreground">1 consulta completa grátis com IA</strong>.{" "}
        Depois disso, é necessário login/cadastro. Logado, cada dia inclui{" "}
        <strong className="text-foreground">1 consulta grátis com IA</strong>; após o limite diário,{" "}
        <strong className="text-foreground">1 crédito por consulta</strong>.
      </p>

      {user && consultCommitLoading && (
        <p className="text-xs text-center text-primary font-body mb-2">A registar a consulta…</p>
      )}
      {user && consultCommitError && (
        <p className="text-xs text-center text-destructive font-body mb-2 px-2">{consultCommitError}</p>
      )}

      {!interpretation && !isLoading && (
        <div className="space-y-4">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Faça uma pergunta para a IA (opcional)..."
            className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground font-body text-lg focus:outline-none focus:border-primary/60 transition-colors"
          />
          <p className="text-[11px] text-center text-muted-foreground/85 font-body px-1 leading-snug">
            Pedidos sobre autoferimento, violência a pessoas ou atos ilegais não são aceites — procure ajuda
            profissional ou emergência se precisar.
          </p>
          <p className="text-[11px] text-center text-muted-foreground/85 font-body px-1 leading-snug">
            A IA não faz diagnóstico médico, não confirma gravidez e não prevê morte com certeza ou prazo. Use como
            reflexão, nunca como substituto de orientação profissional.
          </p>
          <motion.button
            whileHover={{ scale: authLoading ? 1 : 1.03 }}
            whileTap={{ scale: authLoading ? 1 : 0.97 }}
            onClick={() => void handleInterpret()}
            disabled={authLoading || (!guestMode && (consultCommitLoading || !consultationId || !!consultCommitError))}
            className="w-full font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-secondary text-secondary-foreground border border-primary/30 hover:border-primary/60 hover:bg-secondary/80 transition-all flex items-center justify-center gap-2 glow-gold disabled:opacity-50 disabled:pointer-events-none"
          >
            <Sparkles className="w-4 h-4" />
            Interpretar com IA
          </motion.button>
        </div>
      )}

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 py-8"
        >
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="font-display text-sm tracking-[0.2em] uppercase text-primary/70">
            Consultando os astros...
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {quotaHint && interpretation && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs text-primary/80 font-body mb-2"
          >
            {quotaHint}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="font-body text-sm">{error}</p>
            </div>
            {errorFooter === "quota" && (
              <div className="pl-7 space-y-2">
                <p className="text-xs text-muted-foreground font-body">
                  Compre com Mercado Pago (cartão, Pix, etc.) ou volte amanhã para usar a consulta
                  grátis outra vez.
                </p>
                <Link
                  to="/creditos"
                  className="inline-flex text-xs font-display uppercase tracking-wider text-primary hover:underline"
                >
                  Ver pacotes e pagar →
                </Link>
              </div>
            )}
            {errorFooter === "included" && (
              <p className="text-xs text-muted-foreground pl-7 font-body">
                Lembrete: a sua conta inclui{" "}
                <strong className="text-foreground/90">1 consulta por dia</strong> sem usar créditos (ao concluir a
                tiragem). Depois desse limite, são necessários créditos ou pode esperar até o dia seguinte.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {interpretation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-primary/20 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg text-primary tracking-wider">
                Interpretação Mística
              </h3>
            </div>
            <div className="font-body text-foreground/85 text-lg leading-relaxed whitespace-pre-line">
              {interpretation}
            </div>
            <p className="text-xs text-muted-foreground font-body leading-relaxed border-t border-border/60 pt-4">
              <span className="font-semibold text-foreground/75">Aviso:</span> o texto acima é gerado por IA para
              entretenimento e reflexão. Não o trate como previsão nem como conselho profissional; não nos
              responsabilizamos por decisões ou comportamentos baseados nele.
            </p>
            <p className="text-xs text-muted-foreground font-body leading-relaxed pt-2">
              O uso grátis ou o crédito desta tiragem foi aplicado ao concluir a consulta. Pode{" "}
              <strong className="text-foreground/90">gerar outra interpretação</strong> na mesma tiragem sem pagar de novo;
              uma <strong className="text-foreground/90">nova consulta</strong> (nova tiragem) é que contaria outra vez.
            </p>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading || guestMode}
              onClick={() => void handleInterpret({ replaceExisting: true })}
              className="mt-3 w-full font-display tracking-[0.12em] uppercase text-xs px-4 py-3 rounded-lg bg-primary/15 text-primary border border-primary/35 hover:bg-primary/25 transition-all disabled:opacity-50"
            >
              Gerar novamente (sem custo extra)
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AIInterpretation;
