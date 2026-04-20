import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { DealtTarotCard } from "@/data/tarotCards";
import { requestAIInterpretation } from "@/lib/ai";
import {
  consumePendingGuestQuestion,
  GUEST_BLOCKED_TEASER_LINES,
  GUEST_DEVICE_LIMIT_AFTER,
  GUEST_DEVICE_LIMIT_BLOCKED,
  GUEST_POST_FIRST_CTA_BUTTON,
  GUEST_POST_FIRST_INTERP_LINES,
  hasGuestOnceBeenConsumedLocally,
  markGuestOnceConsumedLocally,
  requestGuestInterpretationOnce,
} from "@/lib/guestOnce";
import { trackEvent } from "@/lib/analytics";
import { CTA_DISCOVER_AFTER_ALL_REVEALED } from "@/lib/ctaCopy";
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
  initialQuestion?: string;
  onQuestionChange?: (value: string) => void;
  onGuestConsumed?: () => void;
  onEnsureConsultation?: () => Promise<string | null>;
  /** Chamado quando a interpretação fica disponível (guest ou conta). */
  onInterpretationReady?: () => void;
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
  initialQuestion = "",
  onQuestionChange,
  onGuestConsumed,
  onEnsureConsultation,
  onInterpretationReady,
}: AIInterpretationProps) => {
  const { user, session, isLoading: authLoading, openAuthDialog, refreshAiQuota, aiQuota } = useAuth();
  const loggedInNoCredits = !guestMode && !!user && (aiQuota?.credits_balance ?? 0) <= 0;
  const loggedInWithCredits = !guestMode && !!user && (aiQuota?.credits_balance ?? 0) > 0;
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorFooter, setErrorFooter] = useState<ErrorFooter>(null);
  const [question, setQuestion] = useState(initialQuestion);
  const [quotaHint, setQuotaHint] = useState<string | null>(null);
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    onQuestionChange?.(question);
  }, [question, onQuestionChange]);

  useEffect(() => {
    const pq = consumePendingGuestQuestion();
    if (pq) setQuestion((prev) => (prev.trim() ? prev : pq));
  }, []);

  const handleInterpret = async (opts?: { replaceExisting?: boolean }) => {
    if (authLoading) return;
    if (!user && !guestMode) {
      trackEvent("ai_interpretation_auth_required");
      openAuthDialog(
        "Inicie sessão para ver a leitura completa. Ela fica disponível depois de revelar todas as cartas."
      );
      return;
    }
    if (!guestMode && consultCommitLoading) {
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
    if (guestMode && hasGuestOnceBeenConsumedLocally()) {
      trackEvent("guest_interpretation_blocked_already_used");
      openAuthDialog(GUEST_DEVICE_LIMIT_BLOCKED);
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
        let result: Awaited<ReturnType<typeof requestGuestInterpretationOnce>> | null = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            result = await requestGuestInterpretationOnce({
              spreadName,
              labels,
              cards,
              question: question.trim() || undefined,
            });
            break;
          } catch (err) {
            const e = err as Error & { code?: string };
            if (e.code === "AI_BUSY" && attempt === 0) {
              await wait(1800);
              continue;
            }
            throw err;
          }
        }
        if (!result) {
          throw new Error("Não foi possível concluir a interpretação agora.");
        }
        setInterpretation(result.interpretation);
        onInterpretationReady?.();
        trackEvent("guest_interpretation_success", {
          spread_id: spreadId,
          has_question: question.trim().length > 0,
        });
        markGuestOnceConsumedLocally();
        onGuestConsumed?.();
        setQuotaHint(null);
      } else {
        let effectiveConsultationId = consultationId;
        if (!consultationId) {
          effectiveConsultationId = (await onEnsureConsultation?.()) ?? null;
          if (!effectiveConsultationId) {
            return;
          }
        }
        let result: Awaited<ReturnType<typeof requestAIInterpretation>> | null = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            result = await requestAIInterpretation(
              {
                spreadId,
                spreadName,
                labels,
                cards,
                question: question.trim() || undefined,
                consultationId: effectiveConsultationId as string,
                replaceExisting: opts?.replaceExisting === true,
              },
              { session }
            );
            break;
          } catch (err) {
            const e = err as Error & { code?: string };
            if (e.code === "AI_BUSY" && attempt === 0) {
              await wait(1800);
              continue;
            }
            throw err;
          }
        }
        if (!result) {
          throw new Error("Não foi possível concluir a interpretação agora.");
        }
        setInterpretation(result.interpretation);
        onInterpretationReady?.();
        trackEvent("ai_interpretation_success", {
          spread_id: spreadId,
          used_credit: result.used_credit ?? null,
        });
        await refreshAiQuota();
        if (result.used_credit) {
          setQuotaHint("Esta tiragem ficou registada na sua conta.");
        }
      }
    } catch (err) {
      const e = err as Error & { code?: string; credits?: number; hint?: string };
      if (guestMode) {
        if (e.code === "AI_TRUNCATED") {
          trackEvent("guest_interpretation_failed", { spread_id: spreadId, reason: "truncated" });
          setError(
            e.message ||
              `A leitura veio incompleta. Toque em «${CTA_DISCOVER_AFTER_ALL_REVEALED}» de novo.`
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
        if (e.code === "AI_BUSY") {
          trackEvent("guest_interpretation_failed", { spread_id: spreadId, reason: "ai_busy" });
          setError(
            e.message ||
              "A IA está com alta procura agora. Aguarde alguns segundos e tente novamente."
          );
          return;
        }
        if (e.code === "GUEST_IP_DAILY_LIMIT") {
          trackEvent("guest_interpretation_failed", { spread_id: spreadId, reason: "ip_daily_limit" });
          setError(
            e.message ||
              "Limite de interpretações gratuitas para esta rede hoje. Crie uma conta para continuar ou tente amanhã."
          );
          return;
        }
        if (e.code === "GUEST_ALREADY_USED") {
          trackEvent("guest_interpretation_failed", { spread_id: spreadId, reason: "already_used" });
          markGuestOnceConsumedLocally();
          onGuestConsumed?.();
          openAuthDialog(GUEST_DEVICE_LIMIT_BLOCKED);
          return;
        }
        trackEvent("guest_interpretation_failed", {
          spread_id: spreadId,
          reason: e.code || "unknown",
        });
        setError(
          e.message ||
            `Não foi possível concluir a interpretação grátis. Tente de novo.\n\n${GUEST_DEVICE_LIMIT_BLOCKED}`
        );
        return;
      }
      if (e.message === "AUTH_REQUIRED" || e.code === "AUTH_REQUIRED") {
        openAuthDialog(
          "Inicie sessão para ver a leitura completa. Ela fica disponível depois de revelar todas as cartas."
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
            "Você não tem créditos suficientes agora. Pode ver opções para novas leituras completas na página de pacotes."
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
      id="bloco-interpretacao-ia"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-8 scroll-mt-28"
    >
      {!guestMode && aiQuota && aiQuota.credits_balance > 0 ? (
        <p className="text-sm text-center text-muted-foreground font-body mb-5 px-2 leading-relaxed max-w-md mx-auto">
          <span className="text-primary">✨</span>{" "}
          Cada interpretação completa usa <strong className="text-foreground/95">1 crédito</strong> na conta.
        </p>
      ) : null}

      {user && consultCommitLoading && (
        <p className="text-xs text-center text-primary font-body mb-2">A registar a consulta…</p>
      )}
      {user && consultCommitError && (
        <p className="text-xs text-center font-body mb-2 px-2 text-[hsl(270_42%_72%)]">{consultCommitError}</p>
      )}

      {!interpretation && !isLoading && guestMode && hasGuestOnceBeenConsumedLocally() && (
        <div className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-5 text-center">
          <p className="font-display text-sm text-primary tracking-wide uppercase">Interpretação IA</p>
          <p className="text-base md:text-lg text-foreground font-body font-medium leading-snug">
            {GUEST_BLOCKED_TEASER_LINES[0]}
          </p>
          <p className="text-sm text-muted-foreground font-body leading-relaxed">
            {GUEST_BLOCKED_TEASER_LINES[1]}
          </p>
          <button
            type="button"
            onClick={() => openAuthDialog(GUEST_DEVICE_LIMIT_BLOCKED)}
            className="w-full font-display tracking-[0.08em] uppercase text-sm px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all"
          >
            {GUEST_POST_FIRST_CTA_BUTTON}
          </button>
        </div>
      )}

      {!interpretation && !isLoading && !(guestMode && hasGuestOnceBeenConsumedLocally()) && (
        <div className="space-y-4">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="O que você quer descobrir?"
            className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground font-body text-lg focus:outline-none focus:border-primary/60 transition-colors"
          />
          {loggedInNoCredits ? (
            <Link
              to="/creditos"
              className="w-full font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-secondary text-secondary-foreground border border-primary/30 hover:border-primary/60 hover:bg-secondary/80 transition-all flex items-center justify-center gap-2 glow-gold"
            >
              <Sparkles className="w-4 h-4" />
              Comprar créditos
            </Link>
          ) : (
            <motion.button
              whileHover={{ scale: authLoading ? 1 : 1.03 }}
              whileTap={{ scale: authLoading ? 1 : 0.97 }}
              onClick={() => void handleInterpret()}
              disabled={authLoading || (!guestMode && (consultCommitLoading || !!consultCommitError))}
              className="w-full font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-secondary text-secondary-foreground border border-primary/30 hover:border-primary/60 hover:bg-secondary/80 transition-all flex items-center justify-center gap-2 glow-gold disabled:opacity-50 disabled:pointer-events-none"
            >
              <Sparkles className="w-4 h-4" />
              {loggedInWithCredits ? "Desbloquear leitura (1 crédito)" : CTA_DISCOVER_AFTER_ALL_REVEALED}
            </motion.button>
          )}
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
        {quotaHint && interpretation && !guestMode && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-primary/90 font-body mb-2 whitespace-pre-line leading-relaxed max-w-md mx-auto px-2"
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
              <p className="font-body text-sm whitespace-pre-line">{error}</p>
            </div>
            {errorFooter === "quota" && (
              <div className="pl-7 space-y-2">
                <p className="text-xs text-muted-foreground font-body">
                  Compre com Mercado Pago (cartão, Pix, etc.) para desbloquear novas interpretações com IA.
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
                Recarregue a página, revele todas as cartas de novo e aguarde o registo da consulta. Se persistir, saia e
                entre de novo.
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
            className="space-y-4"
          >
            <motion.div className="bg-card border border-primary/20 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-display text-lg text-primary tracking-wider">
                  Interpretação Mística
                </h3>
              </div>
              <div className="font-body text-foreground/85 text-lg leading-relaxed whitespace-pre-line">
                {interpretation}
              </div>
            </motion.div>
            {guestMode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-4 text-center"
              >
                <p className="text-sm text-foreground font-body font-medium leading-snug">
                  {GUEST_POST_FIRST_INTERP_LINES[0]}
                </p>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  {GUEST_POST_FIRST_INTERP_LINES[1]}
                </p>
                <button
                  type="button"
                  onClick={() => openAuthDialog(GUEST_DEVICE_LIMIT_AFTER)}
                  className="w-full font-display tracking-[0.08em] uppercase text-sm px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all"
                >
                  {GUEST_POST_FIRST_CTA_BUTTON}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AIInterpretation;
