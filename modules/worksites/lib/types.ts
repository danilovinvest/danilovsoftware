/**
 * Types du module chantiers.
 *
 * Ils décrivent ce que servira `GET /v1/worksites` : rien n'est pré-formaté,
 * les montants sont des nombres et les dates des ISO 8601. La forme vient du
 * classeur « CYCLE CHANTIER », qui décrit le cycle réel d'un chantier — c'est
 * la partie du métier que le CRM ignorait entièrement, tout ce qui se passe
 * **après** la signature.
 */

/**
 * Où en est l'exécution.
 *
 * Cet axe est distinct de l'étape commerciale (`project_stage`). La vente et la
 * production n'avancent pas au même rythme : un devis signé peut rester six
 * semaines en attente de sondages sans que la vente recule d'un pas. C'est la
 * même leçon qu'en éclatant la colonne « Statut » du premier classeur.
 *
 * Le statut n'est **pas saisi** : il se déduit des dates et des jalons. Une
 * carte ne se déplace donc pas à la main — on renseigne une date, et elle
 * change de colonne toute seule.
 */
export type WorksiteStatus =
  | "a_planifier"
  | "planifie"
  | "en_cours"
  | "en_attente"
  | "reception"
  | "cloture";

/** Ce qui bloque, quand ça bloque. Repris des statuts d'étude du classeur. */
export type BlockedReason =
  | "elements"
  | "sondages"
  | "tiers"
  | "client"
  | "meteo";

/** État d'une étude, propre à l'ingénierie et indépendant de l'exécution. */
export type StudyStatus =
  | "en_cours"
  | "en_attente_elements"
  | "en_attente_sondages"
  | "termine";

export type CostKind = "sous_traitance" | "materiaux" | "autre";

/**
 * Une ligne de coût.
 *
 * Le classeur a une colonne « sous-traitant » et une colonne « coût
 * matériaux », parce qu'un tableur ne sait pas faire autrement. Une table de
 * lignes couvre les deux avec un seul concept — et accepte plusieurs
 * sous-traitants sur un même chantier, ce que la feuille ne permet pas.
 */
export type Cost = {
  id: string;
  kind: CostKind;
  label: string;
  /** Texte libre : aucun sous-traitant n'apparaît dans les données actuelles,
      une table de fournisseurs serait un objet à gérer pour rien. */
  supplier: string;
  amount_ht: number;
  paid_at: string | null;
};

/** Un règlement attendu : acompte ou solde. */
export type Payment = {
  label: string;
  amount_ttc: number;
  invoiced_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  reminded_at: string | null;
};

/** Un devis de l'affaire, avec l'activité — donc la société — qui l'émet. */
export type WorksiteQuote = {
  reference: string;
  label: string;
  activity_id: string;
  amount_ht: number;
  vat_rate: number;
  signed_at: string | null;
};

export type Worksite = {
  id: string;
  reference: string;
  label: string;
  customer_id: string;
  customer_name: string;
  /** Vrai quand le client est une société du groupe : sort des statistiques
      commerciales et alimente les flux internes. */
  internal: boolean;
  city: string;
  address: string;
  owner_name: string;

  /** Activité pilote — celle qui exécute. Les devis peuvent en viser d'autres. */
  activity_id: string;
  entity_id: string;

  status: WorksiteStatus;
  blocked_reason: BlockedReason | null;
  study_status: StudyStatus | null;

  signed_at: string;
  starts_at: string | null;
  ends_at: string | null;
  /** Fin réelle. Nulle tant que les travaux ne sont pas terminés. */
  completed_at: string | null;
  /** Jours de retard sur la fin prévue. Calculé par le serveur. */
  days_late: number;

  amount_ht: number;
  costs: Cost[];
  /** Somme des coûts engagés. */
  cost_total: number;
  margin: number;
  margin_rate: number;

  deposit: Payment | null;
  balance: Payment | null;

  /** Jalons : une date renseignée vaut « fait », nulle vaut « à faire ». */
  pv_sent_at: string | null;
  pv_signed_at: string | null;
  review_requested_at: string | null;
  review_received_at: string | null;

  quotes: WorksiteQuote[];
};

export type StatusBucket = {
  status: WorksiteStatus;
  count: number;
  amount: number;
};

/** Une ligne de travail : ce qui demande une action aujourd'hui. */
export type Alert = {
  worksite_id: string;
  label: string;
  customer_name: string;
  /** La phrase que le conducteur de travaux lira. */
  reason: string;
  amount: number;
  days: number;
};

export type WorksiteSnapshot = {
  generated_at: string;
  /** Périmètre retenu : société, activité, ou le groupe entier. */
  entity_id: string | null;
  activity_id: string | null;
  metrics: import("@/shared/ui/metric-cards").Metric[];
  worksites: Worksite[];
  board: StatusBucket[];
  /**
   * Signés sans date de démarrage.
   *
   * En tête des quatre listes, et devant « en retard » : un chantier en retard
   * a au moins commencé. Un chantier signé qui n'a pas de date ne commencera
   * pas tout seul, et personne ne le réclamera — c'est le seul de ces quatre
   * cas où l'oubli est silencieux.
   */
  unplanned: Alert[];
  late: Alert[];
  pv_pending: Alert[];
  balance_to_invoice: Alert[];
  review_to_request: Alert[];
};
