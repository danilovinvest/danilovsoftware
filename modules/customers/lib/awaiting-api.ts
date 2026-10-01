import { apiFetch } from "@/shared/api/client";

/** Un devis envoyé qui attend la réponse du client (`GET /v1/quotes/awaiting`). */
export interface AwaitingQuote {
  quote_id: string;
  reference: string;
  label: string;
  kind: string;
  issuer: string;
  issued_at: string | null;
  amount_ht: string | null;
  amount_ttc: string | null;
  customer_id: string;
  customer_name: string;
  /** La fiche est archivée : écartée par défaut. */
  archived: boolean;
  project_id: string;
  project_label: string;
  last_relance_at: string | null;
  /** Le résumé de la dernière relance, qui porte son motif. */
  last_relance_summary: string;
  relances: number;
}

export interface AwaitingQuotes {
  /** Le jour du serveur, AAAA-MM-JJ : c'est lui qui compte l'attente. */
  today: string;
  items: AwaitingQuote[];
}

/** Les devis sans réponse, dans le périmètre du compte. */
export function listAwaitingQuotes(issuer?: string, signal?: AbortSignal) {
  const path = issuer ? `/v1/quotes/awaiting?issuer=${encodeURIComponent(issuer)}` : "/v1/quotes/awaiting";
  return apiFetch<AwaitingQuotes>(path, { signal });
}
