import type { Entity } from "@/modules/group";

/**
 * Types du module facturation.
 *
 * Les factures viennent de `GET /v1/invoices` (01/10) et sont converties par
 * `lib/live.ts` ; tout le reste se dérive d'elles dans `lib/snapshot.ts`.
 * Les montants sont des nombres, les dates des jours `AAAA-MM-JJ`.
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
  | "emise"
  | "partielle"
  | "reglee"
  | "retard"
  | "avoir";

/** La nature d'une facture, telle que la base la porte (`invoice_kind`). */
export type InvoiceKind = "facture" | "acompte" | "situation" | "solde" | "avoir";

export type Invoice = {
  id: string;
  number: string;
  /** Société émettrice, vide quand la pièce n'en porte pas. */
  entity_id: string;
  customer_id: string;
  customer_name: string;
  project_id: string;
  /**
   * Renseigné quand le client est une autre société du groupe. Le CRM ne le
   * sait pas encore : toujours nul, et le panneau des flux internes le dit.
   */
  customer_entity_id: string | null;
  label: string;
  kind: InvoiceKind;
  /** Nul quand la pièce n'a pas de date d'émission : hors de toute période. */
  issued_at: string | null;
  /** Nul quand aucune échéance n'est saisie : jamais « en retard ». */
  due_at: string | null;
  amount_ht: number;
  vat_rate: number;
  amount_vat: number;
  amount_ttc: number;
  paid_amount: number;
  /** Reste dû selon `reste_du`, la règle du recouvrement. */
  remaining: number;
  status: InvoiceStatus;
  /** Jours de retard, 0 si l'échéance n'est pas passée ou pas saisie. */
  days_late: number;
  /** La pièce ne porte pas de montant TTC : elle ne compte nulle part. */
  unpriced: boolean;
  /**
   * Un acompte ou un solde marqué reçu sur la pièce. `reste_du` ne déduit pas
   * l'acompte : un reste dû sur une telle pièce est plus souvent un règlement
   * jamais saisi qu'un impayé.
   */
  marked_received: boolean;
  /** Nombre de virements saisis sur la pièce. */
  payments: number;
};

/** Tranche de la balance âgée : l'ancienneté d'un impayé décide de l'action. */
export type AgedBucket = {
  key: "sans_echeance" | "a_echoir" | "0_30" | "31_60" | "61_90" | "90_plus";
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
  /** Reste dû porté par des pièces marquées reçues, sans virement saisi. */
  unrecorded: { amount: number; count: number };
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
