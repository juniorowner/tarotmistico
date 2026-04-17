import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getValidAccessTokenForFunctions } from "@/lib/ai";
import type { CreditPackageId } from "@/lib/creditPackages";

export type MercadoPagoCheckoutPayload = {
  initPoint: string;
  preferenceId?: string;
  /** UUID em public.credit_orders — obrigatório para ligar webhook/reconcile ao pagamento */
  orderId?: string;
};

export type MercadoPagoProcessResult = {
  status: string;
  payment_id: number | null;
  status_detail?: string | null;
};

export type MercadoPagoPaymentStatus = {
  status: string;
  payment_id: number | null;
  status_detail?: string | null;
};

export async function createMercadoPagoCheckout(
  packageId: CreditPackageId
): Promise<MercadoPagoCheckoutPayload> {
  const token = await getValidAccessTokenForFunctions();
  const { data, error } = await supabase.functions.invoke("mercadopago-create-preference", {
    body: { packageId },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error instanceof FunctionsFetchError) {
    throw new Error("Sem ligação ao servidor. Tente novamente.");
  }
  if (error instanceof FunctionsRelayError) {
    throw new Error("Serviço temporariamente indisponível.");
  }
  if (error instanceof FunctionsHttpError) {
    const t = await error.context.text();
    let msg = "Não foi possível iniciar o pagamento.";
    try {
      const j = JSON.parse(t) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  if (data && typeof data === "object") {
    const initPoint =
      "init_point" in data && typeof (data as { init_point?: unknown }).init_point === "string"
        ? (data as { init_point: string }).init_point
        : "";
    const preferenceId =
      "preference_id" in data && typeof (data as { preference_id?: unknown }).preference_id === "string"
        ? (data as { preference_id: string }).preference_id
        : undefined;
    const orderId =
      "order_id" in data && typeof (data as { order_id?: unknown }).order_id === "string"
        ? (data as { order_id: string }).order_id
        : undefined;

    if (initPoint) {
      return { initPoint, preferenceId, orderId };
    }
  }

  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: string }).error));
  }

  throw new Error("Resposta inválida do servidor de pagamentos.");
}

export async function processMercadoPagoPayment(
  formData: Record<string, unknown>,
  options?: { creditOrderId?: string }
): Promise<MercadoPagoProcessResult> {
  const token = await getValidAccessTokenForFunctions();
  const body =
    options?.creditOrderId && options.creditOrderId.trim().length > 0
      ? { ...formData, credit_order_id: options.creditOrderId.trim() }
      : { ...formData };
  const { data, error } = await supabase.functions.invoke("mercadopago-process-payment", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error instanceof FunctionsFetchError) {
    throw new Error("Sem ligação ao servidor. Tente novamente.");
  }
  if (error instanceof FunctionsRelayError) {
    throw new Error("Serviço temporariamente indisponível.");
  }
  if (error instanceof FunctionsHttpError) {
    const t = await error.context.text();
    let msg = "Não foi possível processar o pagamento.";
    try {
      const j = JSON.parse(t) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  if (
    data &&
    typeof data === "object" &&
    "status" in data &&
    typeof (data as { status?: unknown }).status === "string"
  ) {
    return data as MercadoPagoProcessResult;
  }

  throw new Error("Resposta inválida do processamento de pagamento.");
}

export async function getMercadoPagoPaymentStatus(paymentId: string): Promise<MercadoPagoPaymentStatus> {
  const token = await getValidAccessTokenForFunctions();
  const { data, error } = await supabase.functions.invoke("mercadopago-payment-status", {
    body: { paymentId },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error instanceof FunctionsFetchError) throw new Error("Sem ligação ao servidor.");
  if (error instanceof FunctionsRelayError) throw new Error("Serviço indisponível.");
  if (error instanceof FunctionsHttpError) {
    const t = await error.context.text();
    let msg = "Não foi possível consultar o status do pagamento.";
    try {
      const j = JSON.parse(t) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  if (data && typeof data === "object" && "status" in data) {
    return data as MercadoPagoPaymentStatus;
  }
  throw new Error("Resposta inválida ao consultar status.");
}
