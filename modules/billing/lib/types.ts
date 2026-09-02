import type { Entity } from "@/modules/group";

/**
 * Types du module facturation.
 *
 * Comme pour le tableau de bord, ils décrivent la réponse d'un futur
 * `GET /v1/billing` : rien n'est pré-formaté, les montants sont des nombres et
 * les dates des ISO 8601. Le jour où l'API existera, seul le hook changera.
 */

export type Period = "30j" | "90j" | "12m";

/**
 * Cycle de vie d'une facture.
 *
 * « en retard » n'est pas un statut saisi mais un état déduit de l'échéance :
 * une facture émise devient en retard toute seule, le jour d'après. Le stocker
 * ferait dépendre la vérité d'un traitement nocturne.
 */
export type InvoiceStatus =
  | "brouillon"
  | "emise"
  | "partielle"
  | "reglee"
  | "retard"
  | "avoir";

export type InvoiceKind =
  | "etude"
  | "sondages"
  | "travaux"
  | "attestation"
  | "loyer"
  | "honoraires"
  | "commission"
  | "refacturation";

export type Invoice = {
  id: string;
  number: string;
  /** Société émettrice — une facture appartient toujours à une entité. */
  entity_id: string;
  customer_name: string;
  /** Renseigné quand le client est une autre société du groupe. */
  customer_entity_id: string | null;
  label: string;
  kind: InvoiceKind;
  issued_at: string;
  due_at: string;
  amount_ht: number;
  vat_rate: number;
  amount_vat: number;
  amount_ttc: number;
  paid_amount: number;
  status: InvoiceStatus;
  /** Jours de retard, 0 si l'échéance n'est pas passée. */
  days_late: number;
};

/** Tranche de la balance âgée : l'ancienneté d'un impayé décide de l'action. */
export type AgedBucket = {
  key: "a_echoir" | "0_30" | "31_60" | "61_90" | "90_plus";
  label: string;
  amount: number;
  count: number;
};

export type EntityRevenue = {
  entity: Entity;
  /** Chiffre d'affaires HT facturé sur la période. */
  billed: number;
  /** Part facturée à une autre société du groupe. */
  intra: number;
  collected: number;
  outstanding: number;
  overdue: number;
  invoices: number;
};

/** TVA collectée par entité. Le CRM ne connaît que ce qui est facturé. */
export type VatRow = {
  entity_id: string;
  collected: number;
  /** Base HT correspondante, pour recouper. */
  base: number;
  regime: "mensuel" | "trimestriel";
  /** Période couverte, en clair — « 0 € » ne s'interprète pas sans elle. */
  period_label: string;
  /** Prochaine échéance de déclaration. */
  next_declaration: string;
};

export type FlowKind = "honoraires" | "loyer" | "refacturation";

/** Un flux entre deux sociétés du groupe, agrégé sur la période. */
export type IntraFlow = {
  id: string;
  from_entity_id: string;
  to_entity_id: string;
  kind: FlowKind;
  label: string;
  amount_ht: number;
  invoices: number;
};

export type Metric = {
  key: string;
  label: string;
  hint: string;
  value: number;
  previous: number | null;
  note?: string;
  format: "amount" | "count";
  trend: number[];
  trend_label: string;
};

export type BillingSnapshot = {
  generated_at: string;
  period: Period;
  /** Entité sélectionnée, ou null pour la vue consolidée du groupe. */
  entity_id: string | null;
  metrics: Metric[];
  invoices: Invoice[];
  aged: AgedBucket[];
  revenue: EntityRevenue[];
  vat: VatRow[];
  flows: IntraFlow[];
  /** Chiffre d'affaires cumulé des cinq sociétés, flux internes compris. */
  total_billed: number;
  /** Le même, une fois les flux internes éliminés. */
  consolidated: number;
};
