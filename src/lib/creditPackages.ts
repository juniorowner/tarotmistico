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
    amountCents: 10,
    description: "Ideal para experimentar após as 3 leituras grátis do dia.",
  },
  {
    id: "popular",
    name: "Popular",
    credits: 15,
    amountCents: 20,
    description: "Melhor custo para quem consulta com frequência.",
    highlight: true,
  },
  {
    id: "premium",
    name: "Premium",
    credits: 40,
    amountCents: 30,
    description: "Pacote maior para acompanhar várias tiragens.",
  },
];

export function formatBrl(amountCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);
}
