export type CustomerStatus = "prospect" | "client" | "perdu" | "archive";
export type CustomerSource =
  | "site_web"
  | "telephone"
  | "email"
  | "recommandation"
  | "autre";
export type CustomerKind =
  | "particulier"
  | "societe"
  | "syndic"
  | "architecte"
  | "autre";
export type ProjectStatus =
  | "a_qualifier"
  | "en_cours"
  | "termine"
  | "sans_suite"
  | "annule";
export type QuoteKind = "etude" | "sondages" | "travaux" | "attestation" | "autre";
export type QuoteStatus =
  | "a_faire"
  | "envoye"
  | "accepte"
  | "realise"
  | "refuse"
  | "annule";
export type PaymentStatus = "non_applicable" | "en_attente" | "recu";
export type InteractionKind =
  | "appel"
  | "email"
  | "relance"
  | "rdv"
  | "rapport"
  | "devis"
  | "note";

/** Ligne du tableau : les agrégats sont calculés par l'API. */
export type CustomerListItem = {
  id: string;
  reference: string;
  display_name: string;
  kind: CustomerKind;
  status: CustomerStatus;
  source: CustomerSource;
  company_name: string;
  email: string;
  phone: string;
  city: string;
  requested_at: string | null;
  owner_id: string | null;
  owner_name: string;
  project_count: number;
  quote_count: number;
  won_amount_ttc: string;
  last_interaction_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  reference: string;
  display_name: string;
  kind: CustomerKind;
  status: CustomerStatus;
  source: CustomerSource;
  company_name: string;
  email: string;
  phone: string;
  address_line: string;
  postal_code: string;
  city: string;
  country: string;
  requested_at: string | null;
  notes: string;
  owner_id: string | null;
  owner_name: string;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  customer_id: string;
  full_name: string;
  role_label: string;
  email: string;
  phone: string;
  is_primary: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  customer_id: string;
  label: string;
  status: ProjectStatus;
  site_address: string;
  site_postal_code: string;
  site_city: string;
  notes: string;
  started_at: string | null;
  closed_at: string | null;
  quote_count: number;
  total_amount_ttc: string;
  created_at: string;
  updated_at: string;
};

export type Quote = {
  id: string;
  project_id: string;
  project_label: string;
  customer_id: string;
  reference: string;
  kind: QuoteKind;
  label: string;
  status: QuoteStatus;
  issued_at: string | null;
  amount_ht: string | null;
  amount_ttc: string | null;
  vat_rate: string | null;
  amount_note: string;
  deposit_status: PaymentStatus;
  balance_status: PaymentStatus;
  comment: string;
  created_at: string;
  updated_at: string;
};

export type Interaction = {
  id: string;
  customer_id: string;
  project_id: string | null;
  kind: InteractionKind;
  occurred_at: string;
  summary: string;
  details: string;
  author_name: string;
  created_at: string;
  updated_at: string;
};

/** Réponse de GET /v1/customers/{id} : fiche + collections en un seul appel. */
export type CustomerDetail = Customer & {
  contacts: Contact[];
  projects: Project[];
  quotes: Quote[];
  interactions: Interaction[];
};

export type CustomerStats = {
  by_status: Array<{ status: CustomerStatus; total: number }>;
};

export type CustomerFilters = {
  search?: string;
  status?: CustomerStatus[];
  source?: CustomerSource[];
  city?: string;
  owner_id?: string;
  sort?: "recent" | "name" | "updated" | "requested";
  page?: number;
  per_page?: number;
};

export type CustomerPayload = {
  display_name: string;
  kind: CustomerKind;
  status: CustomerStatus;
  source: CustomerSource;
  company_name: string;
  email: string;
  phone: string;
  address_line: string;
  postal_code: string;
  city: string;
  country: string;
  requested_at: string | null;
  notes: string;
  owner_id: string | null;
};

export type ContactPayload = Omit<
  Contact,
  "id" | "customer_id" | "created_at" | "updated_at"
>;

export type ProjectPayload = Omit<
  Project,
  "id" | "customer_id" | "created_at" | "updated_at" | "quote_count" | "total_amount_ttc"
>;

export type QuotePayload = Omit<
  Quote,
  "id" | "customer_id" | "project_id" | "project_label" | "created_at" | "updated_at"
>;

export type InteractionPayload = {
  project_id: string | null;
  kind: InteractionKind;
  occurred_at: string;
  summary: string;
  details: string;
};
