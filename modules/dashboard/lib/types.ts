import type {
  CustomerKind,
  CustomerStatus,
  ProjectStage,
} from "@/modules/customers";

/**
 * Types du tableau de bord.
 *
 * Ils décrivent la réponse que servira `GET /v1/dashboard?period=…` le jour où
 * l'écran sera branché sur l'API ; en attendant, la même forme est produite par
 * `lib/snapshot.ts` à partir de l'export de devis. Rien n'est pré-formaté —
 * ni euros, ni dates lisibles : le serveur enverra des nombres et des ISO 8601,
 * le français reste l'affaire des composants.
 *
 * Ce que l'export ne contient pas n'apparaît nulle part ici : ni responsable,
 * ni origine de la demande, ni historique de relance, ni état des règlements.
 * Un tableau de bord qui afficherait ces colonnes vides — ou pire, remplies —
 * ferait croire à des données qui n'existent pas.
 */

/** Fenêtre d'observation. Elle pilote les compteurs, pas les listes de travail. */
export type Period = "30j" | "90j" | "12m";

export type MetricFormat = "amount" | "count" | "percent";

/**
 * Santé d'une fiche, telle qu'elle se lit d'un coup d'œil dans la synthèse.
 * Une fiche n'en porte qu'une : c'est le signal le plus fort qui l'emporte.
 */
export type Health = "chaud" | "a_relancer" | "en_cours" | "gagne" | "dormant";

/** Un devis envoyé dont la réponse se fait attendre. */
export type RelanceRow = {
  project_id: string;
  customer_id: string;
  customer_name: string;
  customer_kind: CustomerKind;
  /** Faux quand l'export ne donnait qu'un identifiant client. */
  named: boolean;
  reference: string;
  label: string;
  amount: number;
  issued_at: string;
  days_since: number;
  /** 0-100. Le classement de la liste, et rien d'autre. */
  urgency: number;
  /** La phrase que le chargé d'affaires lira, pas le score. */
  reason: string;
};

/** Un devis parti récemment : le client l'a encore sous les yeux. */
export type HotRow = {
  project_id: string;
  customer_id: string;
  customer_name: string;
  named: boolean;
  reference: string;
  label: string;
  amount: number;
  issued_at: string;
  days_since: number;
  /** 0-100. */
  temperature: number;
  /** Les faits qui font monter le score, dans l'ordre où ils pèsent. */
  signals: string[];
};

export type StageBucket = {
  stage: ProjectStage;
  count: number;
  amount: number;
};

/** Répartition par taux de TVA — la seule nature de travaux que l'export donne. */
export type VatBucket = {
  rate: number;
  label: string;
  hint: string;
  count: number;
  amount: number;
};

export type TopClient = {
  customer_id: string;
  name: string;
  named: boolean;
  kind: CustomerKind;
  status: CustomerStatus;
  quotes: number;
  signed: number;
  pending: number;
  days_since: number;
};

export type ActivityRow = {
  id: string;
  reference: string;
  at: string;
  customer_id: string;
  customer_name: string;
  label: string;
  stage: ProjectStage;
  /** Statut brut de l'export, affiché sans traduction. */
  source_status: string;
  amount: number;
};

/** Une ligne de la synthèse client : tout ce qui compte sur une fiche. */
export type DigestRow = {
  customer_id: string;
  name: string;
  named: boolean;
  kind: CustomerKind;
  status: CustomerStatus;
  health: Health;
  quotes: number;
  /** Devis encore en attente de réponse. */
  pending_quotes: number;
  /** Montant HT des devis en attente. */
  amount_pending: number;
  /** Montant HT accepté ou facturé. */
  amount_signed: number;
  last_quote_at: string;
  days_since: number;
  /** Intitulé du devis qui porte la ligne. */
  focus: string;
  focus_reference: string;
  stage: ProjectStage;
  temperature: number;
  urgency: number;
};

export type DashboardSnapshot = {
  generated_at: string;
  /** Date de l'export dont tout est tiré. */
  source_date: string;
  source_file: string;
  period: Period;
  metrics: import("@/shared/ui/metric-cards").Metric[];
  relances: RelanceRow[];
  /** Nombre total de devis en fenêtre de relance, avant plafonnement. */
  relances_total: number;
  hot: HotRow[];
  pipeline: StageBucket[];
  digest: DigestRow[];
  vat: VatBucket[];
  top_clients: TopClient[];
  activity: ActivityRow[];
};
