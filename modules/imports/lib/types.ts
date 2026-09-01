import type {
  CustomerKind,
  CustomerSource,
  CustomerStatus,
  InteractionKind,
  PaymentStatus,
  ProjectOutcome,
  ProjectStage,
  QuoteKind,
  QuoteStatus,
} from "@/modules/customers";

export type ImportStatus = {
  default_file_available: boolean;
  default_file_path: string;
  default_file_size: number;
  openai_configured: boolean;
  openai_model: string;
};

export type PlannedInteraction = {
  kind: InteractionKind;
  occurred_at: string;
  summary: string;
};

export type PlannedQuote = {
  reference: string;
  kind: QuoteKind;
  label: string;
  status: QuoteStatus;
  issued_at: string | null;
  amount_ht: string | null;
  amount_ttc: string | null;
  amount_note: string;
  deposit_status: PaymentStatus;
  balance_status: PaymentStatus;
  comment: string;
};

export type PlannedProject = {
  label: string;
  stage: ProjectStage;
  outcome: ProjectOutcome | null;
  outcome_note: string;
  site_address: string;
  site_postal_code: string;
  site_city: string;
  started_at: string | null;
  /** Le texte d'origine de la colonne « Statut », gardé pour la relecture. */
  raw_status: string;
  confidence: number;
  classified_by: "openai" | "regles";
  quotes: PlannedQuote[];
  interactions: PlannedInteraction[];
};

export type PlannedCustomer = {
  action: "create" | "update";
  existing_id: string | null;
  display_name: string;
  company_name: string;
  kind: CustomerKind;
  status: CustomerStatus;
  source: CustomerSource;
  email: string;
  phone: string;
  address_line: string;
  postal_code: string;
  city: string;
  requested_at: string | null;
  notes: string;
  source_lines: number[];
  projects: PlannedProject[];
};

export type PlanStats = {
  customers_to_create: number;
  customers_to_update: number;
  projects: number;
  quotes: number;
  interactions: number;
  low_confidence: number;
};

export type Plan = {
  classifier: "openai" | "regles" | "mixte";
  warnings: string[];
  stats: PlanStats;
  customers: PlannedCustomer[];
};

export type ImportReport = {
  customers_created: number;
  customers_updated: number;
  projects_created: number;
  projects_updated: number;
  quotes_created: number;
  quotes_updated: number;
  interactions_added: number;
  interactions_skipped: number;
};

/** En dessous, la classification est signalée à relire. */
export const LOW_CONFIDENCE = 0.6;
