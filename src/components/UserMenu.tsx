import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { LogIn, LogOut, Sparkles } from "lucide-react";

export function UserMenu() {
  const { user, isLoading, credits, openAuthDialog, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="h-9 w-20 rounded-lg bg-card/50 animate-pulse border border-border/50" />
    );
  }

  if (!user) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          trackEvent("auth_dialog_open_clicked", { source: "user_menu" });
          openAuthDialog();
        }}
        className="font-display text-xs tracking-wider uppercase gap-1.5 border-primary/40"
      >
        <LogIn className="h-3.5 w-3.5" />
        Entrar
      </Button>
    );
  }

  const label = user.email?.split("@")[0] ?? "Conta";
  const n = credits ?? 0;

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <Link
        to="/creditos"
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/35 bg-card/70 px-2.5 py-1.5 font-display text-[11px] tracking-wider uppercase text-primary transition-colors hover:bg-primary/10 hover:border-primary/50"
        title="Ver créditos e comprar mais"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        <span>Créditos</span>
        <span className="tabular-nums font-semibold text-foreground">{n}</span>
      </Link>
      <span className="max-w-[120px] truncate text-xs text-muted-foreground font-body" title={user.email ?? ""}>
        {label}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => signOut()}
        className="text-xs uppercase font-display tracking-wider h-8 px-2"
      >
        <LogOut className="h-3.5 w-3.5 mr-1" />
        Sair
      </Button>
    </div>
  );
}
