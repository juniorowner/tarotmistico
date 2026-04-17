import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AiQuotaResponse } from "@/lib/aiQuota";
import { fetchAiQuota } from "@/lib/aiQuota";
import { trackEvent } from "@/lib/analytics";

const POST_LOGIN_REDIRECT_FLAG = "tarot:post-login-redirected:v1";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  credits: number | null;
  /** Leituras grátis restantes hoje + créditos — atualizado com refreshAiQuota */
  aiQuota: AiQuotaResponse | null;
  refreshCredits: () => Promise<void>;
  refreshAiQuota: () => Promise<void>;
  authDialogOpen: boolean;
  authDialogMessage: string | undefined;
  openAuthDialog: (message?: string) => void;
  closeAuthDialog: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);
  const [aiQuota, setAiQuota] = useState<AiQuotaResponse | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogMessage, setAuthDialogMessage] = useState<string | undefined>();

  const refreshCredits = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session?.user) {
      setCredits(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", s.session.user.id)
      .maybeSingle();
    setCredits(data?.credits ?? 0);
  }, []);

  const refreshAiQuota = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session?.user) {
      setAiQuota(null);
      setCredits(null);
      return;
    }
    const q = await fetchAiQuota();
    setAiQuota(q);
    if (q) setCredits(q.credits_balance);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (
        event === "SIGNED_IN" &&
        typeof window !== "undefined" &&
        window.location.pathname !== "/bem-vindo-creditos"
      ) {
        trackEvent("auth_signed_in");
        try {
          const redirected = window.sessionStorage.getItem(POST_LOGIN_REDIRECT_FLAG) === "1";
          if (!redirected) {
            window.sessionStorage.setItem(POST_LOGIN_REDIRECT_FLAG, "1");
            window.location.assign("/bem-vindo-creditos");
          }
        } catch {
          window.location.assign("/bem-vindo-creditos");
        }
      }
      if (event === "SIGNED_OUT" && typeof window !== "undefined") {
        try {
          window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_FLAG);
        } catch {
          // ignore
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      void refreshAiQuota();
      setAuthDialogOpen(false);
      setAuthDialogMessage(undefined);
    } else {
      setCredits(null);
      setAiQuota(null);
    }
  }, [session, refreshAiQuota]);

  const openAuthDialog = useCallback((message?: string) => {
    setAuthDialogMessage(message);
    setAuthDialogOpen(true);
  }, []);

  const closeAuthDialog = useCallback(() => {
    setAuthDialogOpen(false);
    setAuthDialogMessage(undefined);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setCredits(null);
    setAiQuota(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      credits,
      aiQuota,
      refreshCredits,
      refreshAiQuota,
      authDialogOpen,
      authDialogMessage,
      openAuthDialog,
      closeAuthDialog,
      signOut,
    }),
    [
      session,
      isLoading,
      credits,
      aiQuota,
      refreshCredits,
      refreshAiQuota,
      authDialogOpen,
      authDialogMessage,
      openAuthDialog,
      closeAuthDialog,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
