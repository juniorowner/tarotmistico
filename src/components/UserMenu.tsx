import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trackEvent } from "@/lib/analytics";
import { readDisplayNameFromUser } from "@/lib/userDisplay";
import { toast } from "sonner";
import { Loader2, LogIn, LogOut, Mail, Sparkles, User } from "lucide-react";

export function UserMenu() {
  const { user, isLoading, credits, friendlyName, openAuthDialog, signOut, updateDisplayName } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (accountOpen && user) {
      setDraftName(readDisplayNameFromUser(user) ?? "");
    }
  }, [accountOpen, user]);

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

  const n = credits ?? 0;

  const handleSaveDisplayName = async () => {
    setSavingName(true);
    const { error } = await updateDisplayName(draftName);
    setSavingName(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Nome atualizado.");
    setAccountOpen(false);
  };

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

      <Popover open={accountOpen} onOpenChange={setAccountOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex max-w-[min(100vw-12rem,11rem)] items-center gap-1.5 rounded-lg border border-border/60 bg-card/40 px-2 py-1.5 text-left text-xs text-muted-foreground font-body transition-colors hover:bg-card/70 hover:text-foreground hover:border-border"
            title={user.email ?? "Conta"}
          >
            <User className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{friendlyName}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(calc(100vw-2rem),20rem)] p-4 border-border bg-card">
          <div className="space-y-4">
            <div>
              <p className="font-display text-sm text-primary tracking-wide">Sua conta</p>
              <p className="text-[11px] text-muted-foreground mt-1">Sessão e como aparece no site.</p>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display mb-1">E-mail</p>
              <p className="flex items-start gap-2 text-xs text-foreground/90 break-all font-body">
                <Mail className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" aria-hidden />
                {user.email ?? "—"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-display-name" className="text-xs font-body text-muted-foreground">
                Como podemos te chamar?
              </Label>
              <Input
                id="user-display-name"
                type="text"
                autoComplete="nickname"
                placeholder="Seu nome"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveDisplayName();
                }}
                className="font-body text-sm"
              />
              <p className="text-[11px] text-muted-foreground leading-snug">
                Usamos esse nome nos cumprimentos para criar um vínculo mais pessoal. Se deixar vazio, usamos a parte do
                e-mail antes do @.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full font-display uppercase tracking-wider text-xs"
              disabled={savingName}
              onClick={() => void handleSaveDisplayName()}
            >
              {savingName ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  A guardar…
                </>
              ) : (
                "Guardar nome"
              )}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

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
