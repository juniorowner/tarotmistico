import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Sparkles } from "lucide-react";

export function UserMenu() {
  const { user, isLoading, credits, aiQuota, openAuthDialog, signOut } = useAuth();

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
        onClick={() => openAuthDialog()}
        className="font-display text-xs tracking-wider uppercase gap-1.5 border-primary/40"
      >
        <LogIn className="h-3.5 w-3.5" />
        Entrar
      </Button>
    );
  }

  const label = user.email?.split("@")[0] ?? "Conta";
  const freeLeft = aiQuota?.free_remaining_today;

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <Link
        to="/creditos"
        className="hidden sm:inline-flex items-center gap-1.5 text-xs text-primary font-body hover:underline underline-offset-2"
        title="Comprar créditos e ver consultas grátis do dia"
      >
        Créditos
      </Link>
      <span
        className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground font-body"
        title="Consultas grátis restantes hoje (tiragem completa)"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-primary font-medium">{freeLeft ?? "—"}</span>
        <span className="text-muted-foreground/80">/1 grátis hoje</span>
      </span>
      <span
        className="inline-flex items-center gap-1 text-xs text-muted-foreground font-body"
        title="Créditos após a consulta grátis do dia"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary sm:hidden" />
        <span className="text-primary font-medium">{credits ?? "—"}</span>
        <span className="text-muted-foreground/80">créditos</span>
      </span>
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
