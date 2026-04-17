import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, CreditCard, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CREDIT_PACKAGES, formatBrl } from "@/lib/creditPackages";
import type { CreditPackageId } from "@/lib/creditPackages";
import {
  createMercadoPagoCheckout,
  getMercadoPagoPaymentStatus,
  processMercadoPagoPayment,
} from "@/lib/payments";
import { enableDailyPush, disableDailyPush } from "@/lib/webPush";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SEO from "@/components/SEO";

const FREE_PER_DAY = 3;
const PAYMENT_BRICK_CONTAINER_ID = "mp-payment-brick-container";
const STATUS_BRICK_CONTAINER_ID = "mp-status-brick-container";

type MercadoPagoCtor = new (
  key: string,
  options?: { locale?: string }
) => {
  bricks: () => {
    create: (
      brick: string,
      containerId: string,
      settings: Record<string, unknown>
    ) => Promise<{ unmount?: () => void }>;
  };
};

let mpSdkLoader: Promise<void> | null = null;

function loadMercadoPagoSdk() {
  if ((window as { MercadoPago?: MercadoPagoCtor }).MercadoPago) {
    return Promise.resolve();
  }
  if (!mpSdkLoader) {
    mpSdkLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Não foi possível carregar o SDK do Mercado Pago."));
      document.head.appendChild(script);
    });
  }
  return mpSdkLoader;
}

const Creditos = () => {
  const { user, openAuthDialog, credits, aiQuota, refreshAiQuota } = useAuth();
  const [paying, setPaying] = useState<CreditPackageId | null>(null);
  const [enablingPush, setEnablingPush] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutPreferenceId, setCheckoutPreferenceId] = useState<string | null>(null);
  const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutAmount, setCheckoutAmount] = useState<number | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"payment" | "status">("payment");
  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orders, setOrders] = useState<
    Array<{
      id: string;
      package_id: string;
      credits: number;
      amount_cents: number;
      status: string;
      created_at: string;
      paid_at: string | null;
    }>
  >([]);

  type LedgerRow = {
    id: string;
    credits_delta: number;
    balance_after: number;
    event_type: string;
    summary: string;
    created_at: string;
  };
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

  const refreshLedger = useCallback(async () => {
    if (!user) {
      setLedger([]);
      return;
    }
    setLedgerLoading(true);
    try {
      const { data } = await supabase
        .from("credit_ledger")
        .select("id, credits_delta, balance_after, event_type, summary, created_at")
        .order("created_at", { ascending: false })
        .limit(60);
      setLedger((data ?? []) as LedgerRow[]);
    } finally {
      setLedgerLoading(false);
    }
  }, [user]);

  const payStatus = searchParams.get("status");
  useEffect(() => {
    if (!payStatus) return;
    if (payStatus === "success") {
      toast.success("Pagamento recebido. A atualizar créditos…");
      void refreshAiQuota();
      void refreshLedger();
    } else if (payStatus === "pending") {
      toast.message("Pagamento pendente. Os créditos entram quando o Mercado Pago confirmar.");
      void refreshAiQuota();
    } else if (payStatus === "failure") {
      toast.error("Pagamento não concluído. Pode tentar de novo quando quiser.");
    }
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("status");
        return n;
      },
      { replace: true }
    );
  }, [payStatus, setSearchParams, refreshAiQuota, refreshLedger]);

  useEffect(() => {
    if (!("Notification" in window)) return;
    setPushEnabled(Notification.permission === "granted");
  }, []);

  const refreshOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    try {
      const { data } = await supabase
        .from("credit_orders")
        .select("id, package_id, credits, amount_cents, status, created_at, paid_at")
        .order("created_at", { ascending: false })
        .limit(20);
      setOrders((data ?? []) as typeof orders);
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      await refreshAiQuota();
      await refreshOrders();
      await refreshLedger();
    })();
  }, [user, refreshAiQuota, refreshOrders, refreshLedger]);

  const handleBuy = async (packageId: CreditPackageId) => {
    if (!user) {
      openAuthDialog("Inicie sessão para comprar créditos de interpretação por IA.");
      return;
    }
    setPaying(packageId);
    try {
      const checkout = await createMercadoPagoCheckout(packageId);
      const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
      setCheckoutUrl(checkout.initPoint);
      setCheckoutPreferenceId(checkout.preferenceId ?? null);
      setCheckoutOrderId(checkout.orderId ?? null);
      setCheckoutAmount(pkg ? pkg.amountCents / 100 : null);
      setCheckoutError(null);
      setCheckoutStep("payment");
      setCheckoutPaymentId(null);
      setCheckoutOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir o checkout.");
    } finally {
      setPaying(null);
    }
  };

  const freeRem = aiQuota?.free_remaining_today ?? null;
  const used = aiQuota?.used_today ?? null;

  const handleEnablePush = async () => {
    if (!user) {
      openAuthDialog("Inicie sessão para ativar lembrete diário.");
      return;
    }
    setEnablingPush(true);
    try {
      await enableDailyPush(9);
      setPushEnabled(true);
      toast.success("Lembrete diário ativado para 9h (horário local).");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ativar notificações.");
    } finally {
      setEnablingPush(false);
    }
  };

  const handleDisablePush = async () => {
    setEnablingPush(true);
    try {
      await disableDailyPush();
      setPushEnabled(false);
      toast.message("Lembrete diário desativado.");
    } catch {
      toast.error("Não foi possível desativar agora.");
    } finally {
      setEnablingPush(false);
    }
  };

  useEffect(() => {
    if (!checkoutOpen) return;
    if (checkoutStep !== "payment") return;
    if (!checkoutPreferenceId) return;
    if (!checkoutAmount || checkoutAmount <= 0) return;

    const publicKey = (import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY ?? "").trim();
    if (!publicKey) {
      setCheckoutError(
        "Chave pública do Mercado Pago não configurada (VITE_MERCADOPAGO_PUBLIC_KEY)."
      );
      return;
    }

    let active = true;
    let controller: { unmount?: () => void } | null = null;

    const mount = async () => {
      try {
        setCheckoutError(null);
        await loadMercadoPagoSdk();
        if (!active) return;
        const MercadoPago = (window as { MercadoPago?: MercadoPagoCtor }).MercadoPago;
        if (!MercadoPago) throw new Error("SDK do Mercado Pago indisponível.");

        const host = document.getElementById(PAYMENT_BRICK_CONTAINER_ID);
        if (host) host.innerHTML = "";

        const mp = new MercadoPago(publicKey, { locale: "pt-BR" });
        controller = await mp.bricks().create("payment", PAYMENT_BRICK_CONTAINER_ID, {
          initialization: {
            amount: checkoutAmount,
            preferenceId: checkoutPreferenceId,
          },
          customization: {
            paymentMethods: {
              bankTransfer: ["pix"],
            },
          },
          locale: "pt-BR",
          callbacks: {
            onSubmit: (payload: { formData?: Record<string, unknown> } | Record<string, unknown>) => {
              const formData =
                payload && typeof payload === "object" && "formData" in payload
                  ? ((payload as { formData?: Record<string, unknown> }).formData ?? {})
                  : (payload as Record<string, unknown>);
              return processMercadoPagoPayment(formData, {
                creditOrderId: checkoutOrderId ?? undefined,
              }).then((res) => {
                const status = String(res.status || "").toLowerCase();
                const paymentId = res.payment_id != null ? String(res.payment_id) : "";
                if (!paymentId) throw new Error("Pagamento criado sem ID. Tente novamente.");
                setCheckoutPaymentId(paymentId);
                setCheckoutStep("status");
                if (status === "pending" || status === "in_process") {
                  toast.message("Pagamento pendente. Use o QR Code abaixo para concluir.");
                  return;
                }
                if (status === "approved" || status === "authorized") {
                  toast.success("Pagamento aprovado.");
                  void refreshAiQuota();
                  void refreshOrders();
                  return;
                }
                throw new Error("Pagamento não aprovado. Tente outro meio.");
              });
            },
            onReady: () => setCheckoutError(null),
            onError: (err: unknown) =>
              setCheckoutError(
                err instanceof Error
                  ? err.message
                  : "Erro ao abrir o checkout no modal. Use o fallback abaixo."
              ),
          },
        });
      } catch (err) {
        setCheckoutError(
          err instanceof Error
            ? err.message
            : "Não foi possível iniciar o checkout do Mercado Pago."
        );
      }
    };

    void mount();
    return () => {
      active = false;
      if (controller?.unmount) controller.unmount();
    };
  }, [
    checkoutOpen,
    checkoutStep,
    checkoutPreferenceId,
    checkoutOrderId,
    checkoutAmount,
    refreshAiQuota,
  ]);

  useEffect(() => {
    if (!checkoutOpen) return;
    if (checkoutStep !== "status") return;
    if (!checkoutPaymentId) return;

    const publicKey = (import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY ?? "").trim();
    if (!publicKey) {
      setCheckoutError(
        "Chave pública do Mercado Pago não configurada (VITE_MERCADOPAGO_PUBLIC_KEY)."
      );
      return;
    }

    let active = true;
    let controller: { unmount?: () => void } | null = null;

    const mountStatus = async () => {
      try {
        setCheckoutError(null);
        await loadMercadoPagoSdk();
        if (!active) return;
        const MercadoPago = (window as { MercadoPago?: MercadoPagoCtor }).MercadoPago;
        if (!MercadoPago) throw new Error("SDK do Mercado Pago indisponível.");
        const host = document.getElementById(STATUS_BRICK_CONTAINER_ID);
        if (host) host.innerHTML = "";
        const mp = new MercadoPago(publicKey, { locale: "pt-BR" });
        controller = await mp.bricks().create("statusScreen", STATUS_BRICK_CONTAINER_ID, {
          initialization: { paymentId: checkoutPaymentId },
          locale: "pt-BR",
          callbacks: {
            onReady: () => setCheckoutError(null),
            onError: (err: unknown) =>
              setCheckoutError(
                err instanceof Error
                  ? err.message
                  : "Erro ao renderizar status do pagamento."
              ),
          },
        });
      } catch (err) {
        setCheckoutError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar a tela de status do pagamento."
        );
      }
    };

    void mountStatus();
    return () => {
      active = false;
      if (controller?.unmount) controller.unmount();
    };
  }, [checkoutOpen, checkoutStep, checkoutPaymentId]);

  useEffect(() => {
    if (!checkoutOpen || checkoutStep !== "status" || !checkoutPaymentId) return;
    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      try {
        const res = await getMercadoPagoPaymentStatus(checkoutPaymentId);
        if (cancelled) return;
        const status = String(res.status || "").toLowerCase();
        if (status === "approved" || status === "authorized") {
          toast.success("Pagamento confirmado! Créditos atualizados.");
          void refreshAiQuota();
          void refreshOrders();
          setCheckoutOpen(false);
          setCheckoutStep("payment");
          setCheckoutPaymentId(null);
          return;
        }
      } catch {
        // Keep polling silently while user is in modal.
      }
      if (!cancelled) timer = window.setTimeout(poll, 4000);
    };

    timer = window.setTimeout(poll, 4000);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [checkoutOpen, checkoutStep, checkoutPaymentId, refreshAiQuota]);

  return (
    <>
      <SEO
        title="Créditos IA | Tarot Místico"
        description="Compre créditos para continuar as interpretações por IA após o limite grátis diário."
        path="/creditos"
      />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-3xl mx-auto px-4 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary font-body mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Tarot
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="text-center space-y-2">
            <h1 className="font-display text-3xl md:text-4xl tracking-[0.2em] uppercase text-primary">
              Créditos IA
            </h1>
            <p className="text-muted-foreground font-body max-w-xl mx-auto text-sm leading-relaxed">
              Você tem <strong className="text-foreground">{FREE_PER_DAY} consultas grátis por dia</strong>{" "}
              (tiragem completa, todas as cartas reveladas). Depois, cada consulta usa{" "}
              <strong className="text-foreground">1 crédito</strong> (ou pode esperar até o dia seguinte).
            </p>
          </div>

          {user && (
            <div className="rounded-xl border border-primary/25 bg-card/50 p-4 flex flex-wrap items-center justify-center gap-6 text-sm font-body">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                <span>
                  <strong className="text-foreground">{freeRem ?? "—"}</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    grátis restantes hoje
                    {used != null && (
                      <span className="text-muted-foreground/80"> — {used}/{FREE_PER_DAY} usadas</span>
                    )}
                  </span>
                </span>
              </div>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary shrink-0" />
                <span>
                  <strong className="text-foreground">{credits ?? "—"}</strong>
                  <span className="text-muted-foreground"> créditos comprados</span>
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={enablingPush}
                onClick={() => void (pushEnabled ? handleDisablePush() : handleEnablePush())}
              >
                {enablingPush ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    A salvar...
                  </>
                ) : pushEnabled ? (
                  <>
                    <BellOff className="w-4 h-4 mr-2" />
                    Desativar lembrete diário
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Ativar lembrete diário
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {CREDIT_PACKAGES.map((pkg) => (
              <motion.div
                key={pkg.id}
                whileHover={{ y: -4 }}
                className={`rounded-xl border p-6 flex flex-col gap-3 ${
                  pkg.highlight
                    ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card/40"
                }`}
              >
                {pkg.highlight && (
                  <span className="text-xs uppercase tracking-widest text-primary font-display text-center">
                    Mais pedido
                  </span>
                )}
                <h2 className="font-display text-lg text-center tracking-wider uppercase">{pkg.name}</h2>
                <p className="text-3xl font-display text-center text-primary">{formatBrl(pkg.amountCents)}</p>
                <p className="text-sm text-muted-foreground text-center font-body flex-1">{pkg.description}</p>
                <p className="text-center text-sm font-body">
                  <strong className="text-foreground">{pkg.credits}</strong> créditos
                </p>
                <Button
                  type="button"
                  className="w-full font-display uppercase tracking-wider"
                  variant={pkg.highlight ? "default" : "secondary"}
                  disabled={!!paying}
                  onClick={() => void handleBuy(pkg.id)}
                >
                  {paying === pkg.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> A abrir…
                  </>
                  ) : (
                    "Comprar créditos"
                  )}
                </Button>
              </motion.div>
            ))}
          </div>

          <p className="text-xs text-center text-muted-foreground font-body max-w-lg mx-auto leading-relaxed">
            Pagamento processado pelo Mercado Pago (Pix). Após a
            confirmação, os créditos são creditados automaticamente na sua conta.
          </p>

          {user && (
            <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display uppercase tracking-wider text-sm text-primary">Meus pagamentos</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void (async () => {
                      await refreshOrders();
                      await refreshLedger();
                      await refreshAiQuota();
                    })()
                  }
                >
                  Atualizar
                </Button>
              </div>
              {ordersLoading ? (
                <p className="text-sm text-muted-foreground">A carregar pagamentos...</p>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Você ainda não tem pagamentos registrados.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-md border border-border/70 bg-background/50 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-foreground">{formatBrl(o.amount_cents)}</span>
                        <span className="text-xs uppercase text-muted-foreground">{o.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {o.credits} créditos • pacote {o.package_id}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(o.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {user && (
            <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display uppercase tracking-wider text-sm text-primary">
                  Movimentos de créditos
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => void refreshLedger()}>
                  Atualizar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground font-body leading-relaxed">
                Compras, uso em consultas (grátis ou com crédito) e devoluções por falha da IA aparecem aqui, por ordem
                cronológica.
              </p>
              {ledgerLoading ? (
                <p className="text-sm text-muted-foreground">A carregar movimentos...</p>
              ) : ledger.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não há movimentos registados.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {ledger.map((row) => (
                    <div key={row.id} className="rounded-md border border-border/70 bg-background/50 p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-body text-foreground/90 flex-1 leading-snug">{row.summary}</p>
                        <span
                          className={`shrink-0 text-xs font-medium tabular-nums ${
                            row.credits_delta > 0
                              ? "text-emerald-600"
                              : row.credits_delta < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {row.credits_delta > 0 ? "+" : ""}
                          {row.credits_delta} cr.
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span className="uppercase tracking-wide">{row.event_type}</span>
                        <span>Saldo após: {row.balance_after}</span>
                        <span>{new Date(row.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
        </div>
      </div>
      <Dialog
        open={checkoutOpen}
        onOpenChange={(open) => {
          setCheckoutOpen(open);
          if (!open) {
            setCheckoutOrderId(null);
            setCheckoutStep("payment");
            setCheckoutPaymentId(null);
            setCheckoutError(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[88vh] p-0 overflow-hidden border-border bg-card">
          <DialogHeader className="p-4 pb-2 border-b border-border/70">
            <DialogTitle>Pagamento seguro</DialogTitle>
            <DialogDescription>
              Conclua no modal do Mercado Pago. Se não carregar, abra em nova aba.
            </DialogDescription>
          </DialogHeader>
          {checkoutUrl ? (
            <div className="px-4 py-4 space-y-3 overflow-y-auto max-h-[calc(88vh-88px)]">
              <div className="rounded-md border border-border bg-background/60 p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  {checkoutStep === "payment"
                    ? "Finalize o pagamento via Pix no modal do Mercado Pago."
                    : "Acompanhe o status do pagamento abaixo (QR Pix aparece aqui)."}
                </p>
                {checkoutStep === "payment" ? (
                  <div id={PAYMENT_BRICK_CONTAINER_ID} />
                ) : (
                  <div id={STATUS_BRICK_CONTAINER_ID} />
                )}
              </div>
              {checkoutError ? (
                <p className="text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3">
                  {checkoutError}
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Creditos;
