import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";
import { trackEvent } from "@/lib/analytics";

type Phase = "checking" | "ready" | "invalid" | "success";

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("password") && lower.includes("least")) {
    return "A senha não cumpre os requisitos mínimos. Use pelo menos 6 caracteres.";
  }
  if (lower.includes("same password")) {
    return "Escolha uma senha diferente da anterior.";
  }
  return message;
}

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recoveryHintRef = useRef(
    typeof window !== "undefined" &&
      (window.location.hash.includes("type=recovery") ||
        decodeURIComponent(window.location.hash).includes("type=recovery"))
  );
  const sawPasswordRecoveryRef = useRef(false);
  const settledRef = useRef(false);
  const pollIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const clearPoll = () => {
      if (pollIdRef.current !== null) {
        window.clearInterval(pollIdRef.current);
        pollIdRef.current = null;
      }
    };

    const markReady = () => {
      if (cancelled || settledRef.current) return;
      settledRef.current = true;
      clearPoll();
      setPhase("ready");
    };

    const markInvalid = () => {
      if (cancelled || settledRef.current) return;
      settledRef.current = true;
      clearPoll();
      setPhase("invalid");
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        sawPasswordRecoveryRef.current = true;
        markReady();
      }
    });

    const code =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("code") : null;

    if (code) {
      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (cancelled) return;
        if (!error) {
          sawPasswordRecoveryRef.current = true;
          markReady();
        } else {
          markInvalid();
        }
      });
    } else {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        if (session && (sawPasswordRecoveryRef.current || recoveryHintRef.current)) {
          markReady();
        }
      });

      let attempts = 0;
      pollIdRef.current = window.setInterval(() => {
        attempts += 1;
        if (cancelled || settledRef.current || attempts > 20) {
          clearPoll();
          if (!cancelled && !settledRef.current) {
            void supabase.auth.getSession().then(({ data: { session } }) => {
              if (cancelled || settledRef.current) return;
              if (session && recoveryHintRef.current) markReady();
              else markInvalid();
            });
          }
          return;
        }
        void supabase.auth.getSession().then(({ data: { session } }) => {
          if (cancelled || settledRef.current) return;
          if (session && recoveryHintRef.current) {
            markReady();
          }
        });
      }, 400);
    }

    return () => {
      cancelled = true;
      clearPoll();
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const p = password.trim();
      const c = confirm.trim();
      if (p.length < 6) {
        setError("Use pelo menos 6 caracteres na nova senha.");
        return;
      }
      if (p !== c) {
        setError("As senhas não coincidem.");
        return;
      }
      setSubmitting(true);
      const { error: err } = await supabase.auth.updateUser({ password: p });
      setSubmitting(false);
      if (err) {
        setError(formatAuthError(err.message));
        trackEvent("password_reset_failed", { reason: err.message });
        return;
      }
      trackEvent("password_reset_completed");
      setPhase("success");
      window.history.replaceState(null, "", "/recuperar-senha");
      window.setTimeout(() => navigate("/", { replace: true }), 1200);
    },
    [confirm, navigate, password]
  );

  return (
    <>
      <SEO
        title="Nova senha | Tarot Místico"
        description="Defina uma nova senha para a sua conta."
        path="/recuperar-senha"
        noindex
      />
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-12">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="font-display text-xl text-primary">Nova senha</h1>
          <p className="mt-2 text-sm text-muted-foreground font-body">
            {phase === "checking" && "A validar o link de recuperação…"}
            {phase === "invalid" &&
              "Este link expirou ou já foi usado. Peça um novo e-mail na página de entrada."}
            {phase === "ready" && "Escolha uma nova senha para a sua conta."}
            {phase === "success" && "Senha atualizada. A redirecionar…"}
          </p>

          {phase === "checking" && (
            <div className="mt-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            </div>
          )}

          {phase === "invalid" && (
            <div className="mt-6 space-y-4">
              <Button asChild className="w-full font-display uppercase tracking-wider">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </div>
          )}

          {phase === "ready" && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <p className="text-sm text-destructive font-body" role="alert">
                  {error}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="recovery-password"
                  className="text-xs font-display tracking-wider uppercase text-muted-foreground"
                >
                  Nova senha
                </label>
                <Input
                  id="recovery-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="recovery-confirm"
                  className="text-xs font-display tracking-wider uppercase text-muted-foreground"
                >
                  Confirmar senha
                </label>
                <Input
                  id="recovery-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="bg-background"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full font-display uppercase tracking-wider gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Guardar nova senha
              </Button>
            </form>
          )}

          {phase === "success" && (
            <div className="mt-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
