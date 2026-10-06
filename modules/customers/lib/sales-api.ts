import { apiFetch } from "@/shared/api/client";

/** Un mois de devis émis (`GET /v1/sales`). Les montants sont TTC, HT à défaut. */
export interface SalesMonth {
  /** AAAA-MM */
  month: string;
  issued: number;
  issued_amount: string;
  signed: number;
  signed_amount: string;
  refused: number;
  pending: number;
  /** Devis sans aucun montant : comptés, jamais additionnés. */
  unpriced: number;
}

export interface SalesSummary {
  /** Douze mois, du plus ancien au courant, les mois vides à zéro. */
  months: SalesMonth[];
  /** Devis sans date d'émission, hors de tout mois. */
  undated: number;
}

/** La synthèse commerciale du périmètre, sur douze mois. */
export function getSales(issuer?: string, signal?: AbortSignal) {
  const path = issuer ? `/v1/sales?issuer=${encodeURIComponent(issuer)}` : "/v1/sales";
  return apiFetch<SalesSummary>(path, { signal });
}
