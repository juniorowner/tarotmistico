import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { Loader2, Lock, Mail } from "lucide-react";

/** Mensagens do Supabase Auth em português quando fizer sentido */
function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("email address") && lower.includes("is invalid")) {
    return "Esse e-mail foi considerado inválido. Tente digitar novamente sem espaços/aspas e confirme se o endereço está no formato nome@dominio.com.";
  }
  if (
    lower.includes("rate limit") ||
    lower.includes("email rate") ||
    lower.includes("too many requests") ||
    lower.includes("over_email_send_rate_limit")
  ) {
    return "Limite de envio de e-mails atingido (o Supabase limita convites por hora no plano gratuito). Aguarde cerca de uma hora, use «Continuar com Google» ou configure um servidor SMTP próprio no painel do Supabase (Authentication → SMTP).";
  }
  if (
    lower.includes("for security purposes") &&
    (lower.includes("only request this after") || lower.includes("request this after"))
  ) {
    const m = message.match(/(\d+)\s*seconds?/i);
    const secs = m?.[1];
    return secs
      ? `Por segurança, aguarde ${secs} segundos antes de tentar de novo.`
      : "Por segurança, aguarde alguns segundos antes de tentar de novo.";
  }
  if (
    lower.includes("unsupported provider") ||
    (lower.includes("provider") &&
      (lower.includes("not enabled") || lower.includes("disabled"))) ||
    (lower.includes("google") &&
      (lower.includes("not configured") || lower.includes("invalid client")))
  ) {
    return "O login com Google ainda não está ativo no Supabase. No painel: Authentication → Providers → Google → ativar e colar Client ID e Secret do Google Cloud Console. Redirect URI no Google: https://SEU-PROJETO.supabase.co/auth/v1/callback";
  }
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("email not confirmed") ||
    lower.includes("invalid email or password")
  ) {
    return "Não foi possível entrar: confira o e-mail e a senha. Se você acabou de criar a conta, abra o link de confirmação enviado por e-mail e tente novamente.";
  }
  return message;
}

function sanitizeEmail(raw: string): string {
  return raw
    .trim()
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase();
}

export function AuthDialog() {
  const { authDialogOpen, authDialogMessage, closeAuthDialog } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const handleResendConfirmation = async () => {
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) return;
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: { emailRedirectTo: `${origin}/` },
    });
    setLoading(false);
    if (err) {
      setError(formatAuthError(err.message));
      return;
    }
    setInfoMessage("E-mail de confirmação reenviado. Verifique a caixa de entrada e o spam.");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setCanResendConfirmation(false);
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) return;

    setLoading(true);
    trackEvent("password_reset_requested");
    const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${origin}/recuperar-senha`,
    });
    setLoading(false);
    if (err) {
      setError(formatAuthError(err.message));
      trackEvent("password_reset_email_failed", { reason: err.message });
      return;
    }
    setInfoMessage(
      "Se existir uma conta com este e-mail, enviámos instruções para redefinir a senha. Verifique a caixa de entrada e o spam."
    );
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setCanResendConfirmation(false);
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail || (!forgotPassword && !password)) return;

    setLoading(true);
    const { data, error: err } = isSignUp
      ? await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: `${origin}/` },
        })
      : await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
    setLoading(false);

    if (err) {
      const raw = err.message.toLowerCase();
      const emailNotConfirmed =
        raw.includes("email not confirmed") || raw.includes("email_not_confirmed");
      setError(formatAuthError(err.message));
      setCanResendConfirmation(emailNotConfirmed);
      return;
    }

    if (isSignUp) {
      if (data.session) {
        closeAuthDialog();
        return;
      }
      setInfoMessage(
        "Enviamos um e-mail de confirmação. Abra o link no e-mail para ativar a conta."
      );
      setCanResendConfirmation(true);
    } else {
      closeAuthDialog();
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/` },
    });
    setLoading(false);
    if (err) setError(formatAuthError(err.message));
  };

  return (
    <Dialog
      open={authDialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeAuthDialog();
          setEmail("");
          setPassword("");
          setIsSignUp(false);
          setForgotPassword(false);
          setError(null);
          setInfoMessage(null);
          setCanResendConfirmation(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary">
            {forgotPassword ? "Recuperar senha" : "Entrar ou criar conta"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-body text-left">
            {forgotPassword
              ? "Indique o e-mail da conta. Enviaremos um link seguro para definir uma nova senha."
              : authDialogMessage ??
                "Entre com e-mail e senha ou continue com Google para sincronizar o seu diário."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={forgotPassword ? handleForgotPassword : handleEmailAuth} className="space-y-4">
          {infoMessage && (
            <p className="text-sm text-primary font-body" role="status">
              {infoMessage}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive font-body" role="alert">
              {error}
            </p>
          )}
          {canResendConfirmation && sanitizeEmail(email) && (
            <div className="text-center">
              <button
                type="button"
                className="text-sm font-body text-primary underline underline-offset-2 hover:text-primary/80 disabled:opacity-50"
                onClick={handleResendConfirmation}
                disabled={loading}
              >
                Reenviar e-mail de confirmação
              </button>
            </div>
          )}

          {!forgotPassword && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={isSignUp ? "outline" : "default"}
                onClick={() => {
                  setIsSignUp(false);
                  setInfoMessage(null);
                  setCanResendConfirmation(false);
                  setError(null);
                }}
                disabled={loading}
                className="font-display tracking-wider uppercase"
              >
                Entrar
              </Button>
              <Button
                type="button"
                variant={isSignUp ? "default" : "outline"}
                onClick={() => {
                  setIsSignUp(true);
                  setInfoMessage(null);
                  setCanResendConfirmation(false);
                  setError(null);
                }}
                disabled={loading}
                className="font-display tracking-wider uppercase"
              >
                Criar conta
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="auth-email" className="text-xs font-display tracking-wider uppercase text-muted-foreground">
              E-mail
            </label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background"
            />
          </div>

          {!forgotPassword && (
            <div className="flex flex-col gap-2">
              <label htmlFor="auth-password" className="text-xs font-display tracking-wider uppercase text-muted-foreground">
                Senha
              </label>
              <Input
                id="auth-password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background"
              />
            </div>
          )}

          {!isSignUp && !forgotPassword && (
            <div className="text-right">
              <button
                type="button"
                className="text-xs font-body text-primary underline underline-offset-2 hover:text-primary/80 disabled:opacity-50"
                onClick={() => {
                  setForgotPassword(true);
                  setError(null);
                  setInfoMessage(null);
                  setCanResendConfirmation(false);
                }}
                disabled={loading}
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full font-display tracking-wider uppercase gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {forgotPassword
              ? "Enviar link por e-mail"
              : isSignUp
                ? "Criar conta com e-mail"
                : "Entrar com e-mail"}
          </Button>

          {forgotPassword && (
            <div className="text-center">
              <button
                type="button"
                className="text-sm font-body text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                onClick={() => {
                  setForgotPassword(false);
                  setError(null);
                  setInfoMessage(null);
                }}
                disabled={loading}
              >
                Voltar ao login
              </button>
            </div>
          )}

          {!forgotPassword && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-display tracking-widest">
                    ou
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full font-display tracking-wider uppercase gap-2"
                onClick={handleGoogle}
                disabled={loading}
              >
                <Mail className="h-4 w-4" />
                Continuar com Google
              </Button>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
