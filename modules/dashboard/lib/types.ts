import type {
  CustomerKind,
  CustomerSource,
  CustomerStatus,
  InteractionKind,
  PaymentStatus,
  ProjectOutcome,
  ProjectStage,
  QuoteStatus,
} from "@/modules/customers";

/**
 * Types du tableau de bord.
 *
 * Ils décrivent la réponse que servira `GET /v1/dashboard?period=…` le jour où
 * l'écran sera branché sur l'API. Tant que cet endpoint n'existe pas, la même
 * forme est produite par `lib/snapshot.ts` à partir du jeu de démonstration :
 * brancher le vrai serveur ne touchera qu'un fichier, `hooks/use-dashboard.ts`.
 *
 * C'est aussi pour cela que rien n'est pré-formaté ici — ni euros, ni dates
 * lisibles. Le serveur enverra des nombres et des ISO 8601 ; le français et le
 * fr-FR restent l'affaire des composants.
 */

/** Fenêtre d'observation. Elle pilote les compteurs, pas les listes de travail. */
export type Period = "30j" | "90j" | "12m";

export type MetricFormat = "amount" | "count" | "percent";

export type Metric = {
  key: string;
  label: string;
  /** Ce que le chiffre veut dire, en une ligne — un KPI sans définition ment. */
  hint: string;
  value: number;
  /**
   * Même mesure sur la période précédente de même durée, ou `null` quand la
   * comparaison n'a pas de sens — un encours se lit à l'instant t, il n'a pas
   * de « mois dernier ».
   */
  previous: number | null;
  format: MetricFormat;
  /** Douze points mensuels, du plus ancien au plus récent. */
  trend: number[];
  /** Ce que la courbe montre — une sparkline sans légende raconte n'importe quoi. */
  trend_label: string;
};

/**
 * Santé d'une fiche, telle qu'elle se lit d'un coup d'œil dans la synthèse.
 * Une fiche n'en porte qu'une : c'est le signal le plus fort qui l'emporte.
 */
export type Health = "chaud" | "a_relancer" | "en_cours" | "gagne" | "dormant";

/** Une affaire qu'il faut relancer, avec le pourquoi et l'urgence chiffrée. */
export type RelanceRow = {
  project_id: string;
  customer_id: string;
  customer_name: string;
  customer_kind: CustomerKind;
  label: string;
  city: string;
  stage: ProjectStage;
  outcome: ProjectOutcome | null;
  amount: number;
  last_contact_at: string;
  days_since: number;
  /** Délai au-delà duquel l'étape considérée est en souffrance. */
  threshold: number;
  reminders: number;
  owner_name: string;
  phone: string;
  /** 0-100. Le classement de la liste, et rien d'autre. */
  urgency: number;
  /** La phrase que le chargé d'affaires lira, pas le score. */
  reason: string;
  next_action: string;
};

/** Une affaire qui avance : le score dit à quel point elle est près de signer. */
export type HotRow = {
  project_id: string;
  customer_id: string;
  customer_name: string;
  label: string;
  city: string;
  stage: ProjectStage;
  amount: number;
  last_contact_at: string;
  days_since: number;
  owner_name: string;
  /** 0-100. */
  temperature: number;
  /** Les faits qui font monter le score, dans l'ordre où ils pèsent. */
  signals: string[];
  next_action: string;
};

export type StageBucket = {
  stage: ProjectStage;
  count: number;
  amount: number;
};

export type SourceBucket = {
  source: CustomerSource;
  requests: number;
  won: number;
  amount: number;
};

/** Une échéance des quinze prochains jours. */
export type AgendaEvent = {
  id: string;
  at: string;
  kind: "rdv" | "etude" | "relance" | "devis" | "chantier";
  label: string;
  customer_name: string;
  owner_name: string;
};

/** Un devis qui attend quelque chose : une réponse, un acompte, un solde. */
export type CashRow = {
  quote_id: string;
  reference: string;
  customer_name: string;
  label: string;
  amount: number;
  issued_at: string;
  days_since: number;
  status: QuoteStatus;
  deposit: PaymentStatus;
  balance: PaymentStatus;
  /** Ce qui manque : « réponse », « acompte », « solde ». */
  waiting_for: "reponse" | "acompte" | "solde";
};

export type ActivityRow = {
  id: string;
  kind: InteractionKind;
  at: string;
  customer_id: string;
  customer_name: string;
  summary: string;
  author_name: string;
};

/** Une ligne de la synthèse client : tout ce qui compte sur une fiche. */
export type DigestRow = {
  customer_id: string;
  name: string;
  kind: CustomerKind;
  status: CustomerStatus;
  city: string;
  owner_name: string;
  health: Health;
  open_projects: number;
  /** Montant des affaires encore ouvertes. */
  amount_open: number;
  /** Montant déjà signé, toutes périodes confondues. */
  amount_won: number;
  last_contact_at: string | null;
  days_since: number | null;
  next_action: string;
  /** Étape de l'affaire la plus avancée encore ouverte. */
  stage: ProjectStage | null;
  temperature: number;
  urgency: number;
};

export type WorkloadRow = {
  owner_name: string;
  open_projects: number;
  /** Affaires dont la relance a dépassé le seuil de leur étape. */
  late_relances: number;
  amount_open: number;
  open_tasks: number;
  overdue_tasks: number;
};

export type DashboardSnapshot = {
  generated_at: string;
  period: Period;
  metrics: Metric[];
  relances: RelanceRow[];
  hot: HotRow[];
  pipeline: StageBucket[];
  agenda: AgendaEvent[];
  digest: DigestRow[];
  sources: SourceBucket[];
  cash: CashRow[];
  activity: ActivityRow[];
  workload: WorkloadRow[];
};
