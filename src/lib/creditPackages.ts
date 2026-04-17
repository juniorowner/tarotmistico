/** Pacotes de créditos (espelhar em supabase/functions/mercadopago-create-preference) */
export type CreditPackageId = "essencial" | "popular" | "premium";

export interface CreditPackage {
  id: CreditPackageId;
  name: string;
  credits: number;
  /** centavos BRL */
  amountCents: number;
  description: string;
  highlight?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "essencial",
    name: "Essencial",
    credits: 5,
    amountCents: 990,
    description: "Pacote de entrada para testar as interpretações por IA.",
  },
  {
    id: "popular",
    name: "Popular",
    credits: 15,
    amountCents: 2490,
    description: "Pacote principal com melhor equilíbrio entre valor e quantidade.",
    highlight: true,
  },
  {
    id: "premium",
    name: "Premium",
    credits: 40,
    amountCents: 4990,
    description: "Pacote premium para uso frequente e continuidade das leituras.",
  },
];

export function formatBrl(amountCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);
}
