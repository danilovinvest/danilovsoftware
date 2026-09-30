/**
 * Les types de l'espace syndic (migration 109), miroirs de l'API.
 *
 * Un fichier à part plutôt que `types.ts`, qui dépasse déjà sa taille : ces
 * types ne servent qu'au portefeuille, à la gestion d'une copropriété, au
 * circuit de facturation et au recouvrement.
 */

/** Les validations d'une copropriété, à plat dans les jalons d'une affaire. */
export type CoproValidations = {
  /** L'assemblée générale qui examine les travaux. */
  ag_at: string | null;
  /** Le vote des travaux. */
  works_voted_at: string | null;
  /** Le bon pour accord du syndic, distinct de la signature de l'occupant. */
  syndic_approval_at: string | null;
  /** Les fonds de l'assureur : qui, combien, et quand ils sont arrivés. */
  insurance_funds_insurer: string;
  insurance_funds_amount: string | null;
  insurance_funds_received_at: string | null;
  /** Le PV de réception que le syndic contresigne. */
  pv_syndic_sent_at: string | null;
  pv_syndic_signed_at: string | null;
};

/** Le circuit de facturation d'une fiche. */
export type BillingRules = {
  billing_email: string;
  supplier_reference: string;
  portal_name: string;
  portal_url: string;
  portal_reference: string;
  statement_label: string;
  note: string;
};

export const EMPTY_RULES: BillingRules = {
  billing_email: "",
  supplier_reference: "",
  portal_name: "",
  portal_url: "",
  portal_reference: "",
  statement_label: "",
  note: "",
};

/** Un cabinet d'une succession. */
export type ChainMember = {
  id: string;
  name: string;
  link_id?: string;
  started_at?: string | null;
};

/** Une époque où un cabinet gérait l'immeuble. */
export type PortfolioPeriod = {
  link_id: string;
  syndic_id: string;
  syndic_name: string;
  started_at: string | null;
  ended_at: string | null;
};

/** Ce qu'un ensemble d'affaires a rapporté et doit encore. */
export type PortfolioMoney = {
  projects: number;
  open_projects: number;
  market: string;
  invoiced: string;
  collected: string;
  remaining: string;
};

/** `gere` : le cabinet le gère. `herite` : un prédécesseur. `ancien` : plus personne. */
export type BuildingState = "gere" | "herite" | "ancien";

export type PortfolioBuilding = PortfolioMoney & {
  id: string;
  name: string;
  kind: string;
  city: string;
  status: string;
  state: BuildingState;
  via?: string;
  periods: PortfolioPeriod[];
  handlers: string[];
  statement_label: string;
};

export type BuildingRef = { id: string; name: string };

export type Gestionnaire = {
  contact_id: string;
  full_name: string;
  role_label: string;
  email: string;
  phone: string;
  buildings: BuildingRef[];
};

/** Une facture à recouvrer. */
export type Recovery = {
  quote_id: string;
  reference: string;
  issuer: string;
  issued_at: string | null;
  due_at: string | null;
  customer_id: string;
  customer_name: string;
  project_id: string;
  project_label: string;
  payer_name: string;
  net: string;
  remaining: string;
  days_late: number;
  last_step: DunningStage | "";
  last_step_at: string | null;
  last_claimed: string | null;
  steps: number;
  /** La dernière marche a réclamé un autre montant que le reste dû du jour. */
  stale: boolean;
};

export type Portfolio = {
  predecessors: ChainMember[];
  successors: ChainMember[];
  buildings: PortfolioBuilding[];
  direct: PortfolioMoney;
  totals: PortfolioMoney;
  payment_delay_days: number | null;
  payment_delay_on: number;
  gestionnaires: Gestionnaire[];
  billing_rules: BillingRules;
  recovery: Recovery[];
};

/** Une époque de gestion, vue de la copropriété. */
export type SyndicPeriod = {
  link_id: string;
  syndic_id: string;
  syndic_name: string;
  syndic_kind: string;
  started_at: string | null;
  ended_at: string | null;
  current: boolean;
  note: string;
};

export type BuildingHandler = {
  contact_id: string;
  full_name: string;
  email: string;
  phone: string;
  company_id: string;
  company_name: string;
};

/** La gestion d'une copropriété : ses syndics, qui la suit, ses règles. */
export type Management = {
  history: SyndicPeriod[];
  handlers: BuildingHandler[];
  billing_rules: BillingRules;
  successors: ChainMember[];
};

export type RuleSource = {
  customer_id: string;
  name: string;
  role: "copropriete" | "payeur" | "syndic";
  rules: BillingRules;
};

/** Le circuit de facturation d'une affaire, étage par étage. */
export type ProjectBilling = {
  sources: RuleSource[];
  effective: BillingRules;
  from: Partial<Record<keyof BillingRules, string>>;
};

/** Les marches du recouvrement, dans l'ordre où on les monte. */
export type DunningStage = "courriel" | "lrar" | "huissier" | "assignation" | "decision";

export type DunningStep = {
  id: string;
  step: DunningStage;
  done_at: string;
  amount_claimed: string | null;
  note: string;
  document_url: string;
};

export type Dunning = {
  quote_id: string;
  reference: string;
  net: string;
  remaining: string;
  steps: DunningStep[];
};

export type DunningPayload = {
  step: DunningStage;
  done_at: string;
  amount_claimed?: string | null;
  note?: string;
  document_url?: string;
};
