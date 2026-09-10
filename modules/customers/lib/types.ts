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
/** Étape du pipeline, ordonnée : une affaire n'en occupe qu'une à la fois. */
export type ProjectStage =
  | "demande_recue"
  | "qualification"
  | "rdv_planifie"
  | "etude_a_produire"
  | "proposition_envoyee"
  | "devis_envoye"
  | "gagne"
  | "realise";

/**
 * Raison pour laquelle une affaire n'avance plus. Nulle tant qu'elle avance.
 * Certaines issues la closent, d'autres la suspendent — l'API le dit dans
 * project_outcomes_closing / project_outcomes_pausing.
 */
export type ProjectOutcome =
  | "sans_reponse"
  | "sans_suite"
  | "concurrence"
  | "refuse_par_nous"
  | "transfere"
  | "stand_by"
  | "bloque_tiers";
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
/** Vue compacte d'une affaire, servie avec la ligne du client dans la liste. */
export type ProjectSummary = {
  id: string;
  label: string;
  stage: ProjectStage;
  outcome: ProjectOutcome | null;
  outcome_note: string;
  source_status: string;
  site_city: string;
  started_at: string | null;
  quote_count: number;
  total_amount_ttc: string;
  last_reminder_at: string | null;
};

/**
 * Les deux crans de relecture d'une fiche.
 *
 * Deux affirmations distinctes, et c'est pour cela qu'il y en a deux :
 * « je l'ai regardée, elle n'est pas absurde » n'est pas « elle est complète ».
 * Nuls tant que personne n'a coché.
 */
export type Review = {
  verified_at: string | null;
  verified_by_name: string;
  completed_at: string | null;
  completed_by_name: string;
};

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
  review: Review;
  /** Affaires du client : le tableau les déplie en sous-lignes. */
  projects: ProjectSummary[];
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
  review: Review;
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
  stage: ProjectStage;
  outcome: ProjectOutcome | null;
  outcome_note: string;
  /** Texte brut repris du classeur Excel ; vide pour une affaire saisie ici. */
  source_status: string;
  site_address: string;
  site_postal_code: string;
  site_city: string;
  notes: string;
  started_at: string | null;
  closed_at: string | null;
  quote_count: number;
  total_amount_ttc: string;
  last_reminder_at: string | null;
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
  /**
   * La société qui émet ce devis.
   *
   * C'est le devis qui porte le SIREN, la TVA et le dossier comptable, pas
   * l'affaire : une même affaire peut porter l'étude de STRUCTURE et les
   * travaux de GROUPE.
   */
  issuer: string | null;
  deposit_status: PaymentStatus;
  /** Depuis quand l'acompte est facturé, et depuis quand il est encaissé. */
  deposit_invoiced_at: string | null;
  deposit_paid_at: string | null;
  balance_status: PaymentStatus;
  comment: string;
  /**
   * Le document du devis, chez Microsoft. Vide pour un devis saisi à la main.
   * Le fichier n'entre pas dans le CRM : il s'ouvre d'un clic.
   */
  drive_url: string;
  drive_name: string;
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

/**
 * Les jalons d'après-signature d'une affaire, tels que l'API les sert.
 *
 * La date de chantier n'est pas ici : réserver une date, c'est renseigner
 * `Project.started_at`, la colonne que l'écran Chantiers lit déjà.
 */
export type Milestones = {
  project_id: string;
  rib_sent_at: string | null;
  insurance_sent_at: string | null;
  materials_ordered_at: string | null;
  /** Quand reprendre une affaire reportée. */
  resume_at: string | null;
  /** Les plans d'exécution envoyés — le jalon de rendu du bureau d'études. */
  plans_sent_at: string | null;
  pv_sent_at: string | null;
  pv_signed_at: string | null;
  visit_report_sent_at: string | null;
  survey_report_sent_at: string | null;
  /** L'avis client : demander n'est pas recevoir, d'où deux dates. */
  review_requested_at: string | null;
  review_received_at: string | null;
  /*
    Les cinq crans cochés à la main.

    Ce ne sont pas des jalons d'exécution : ce sont les crans que **rien ne
    date** — premier contact, rendez-vous, envoi du devis, négociation,
    signature — et qu'on ne pouvait donc franchir qu'en produisant la pièce
    correspondante. Une marque n'efface pas le fait qui la double : un devis
    accepté garde « Signé » franchi même sans marque.
  */
  contact_at: string | null;
  rdv_at: string | null;
  quote_sent_at: string | null;
  negotiation_at: string | null;
  signed_at: string | null;
};

/** Réponse de GET /v1/customers/{id} : fiche + collections en un seul appel. */
export type CustomerDetail = Customer & {
  contacts: Contact[];
  projects: Project[];
  quotes: Quote[];
  interactions: Interaction[];
  milestones: Milestones[];
};

/**
 * Combien de fiches derrière chaque filtre de travail.
 *
 * Un filtre sans son compte ne dit pas s'il vaut le clic : « À relancer 63 » et
 * « Sans RDV 0 » ne s'ouvrent pas de la même façon.
 */
export type FilterCounts = {
  toutes: number;
  a_relancer: number;
  sans_rdv: number;
  devis_en_attente: number;
  acompte_en_attente: number;
  sans_date: number;
  a_verifier: number;
  a_completer: number;
};

export type CustomerStats = {
  by_status: Array<{ status: CustomerStatus; total: number }>;
  by_filter: FilterCounts;
};

export type CustomerFilters = {
  /** Le filtre de cycle, résolu par le serveur sur toute la base. */
  cycle?: string;
  /** La relecture : ce qui reste à vérifier, ce qui reste à compléter. */
  review?: string;
  /** Le périmètre : la société sur laquelle on travaille. */
  issuer?: string;
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
  | "id"
  | "customer_id"
  | "created_at"
  | "updated_at"
  | "quote_count"
  | "total_amount_ttc"
  | "last_reminder_at"
  | "source_status"
>;

export type StagePayload = {
  stage: ProjectStage;
  outcome: ProjectOutcome | null;
  outcome_note: string;
};

/**
 * Ce qu'on envoie pour créer ou modifier un devis.
 *
 * Le document OneDrive n'en fait pas partie : il est posé par la copie, qui
 * seule connaît l'adresse du fichier. Le laisser saisissable inviterait à
 * coller une adresse à la main, qui cesserait d'être juste au premier dossier
 * déplacé.
 */
/*
  Les dates de l'acompte sont exclues : le serveur les pose lui-même à partir du
  statut, comme `completed_at` suit le statut d'une tâche. Les laisser dans la
  charge utile inviterait l'écran à en proposer une, et il y aurait deux
  vérités sur la même question.
*/
export type QuotePayload = Omit<
  Quote,
  // `issuer` reste facultatif à l'écriture : vide, le serveur le déduit de la
  // nature de la prestation. L'écran ne le propose que pour corriger.
  | "issuer"
  | "id"
  | "customer_id"
  | "project_id"
  | "project_label"
  | "drive_url"
  | "drive_name"
  | "created_at"
  | "updated_at"
  | "deposit_invoiced_at"
  | "deposit_paid_at"
> & { issuer?: string | null };

export type InteractionPayload = {
  project_id: string | null;
  kind: InteractionKind;
  occurred_at: string;
  summary: string;
  details: string;
};

/**
 * Ce que le modèle propose après avoir lu les courriels d'un client.
 *
 * Chaque valeur porte sa **preuve** — l'objet du message et sa date — et sa
 * confiance. Une valeur sans preuve est écartée côté serveur : un modèle qui
 * doit citer invente beaucoup moins, et une valeur qu'on ne peut pas vérifier
 * n'a rien à faire sur une fiche.
 */
export type Finding = {
  value: string;
  evidence: string;
  confidence: number;
};

export type FoundContact = {
  name: string;
  role: string;
  email: string;
  phone: string;
};

/** Un message que le modèle a jugé relatif à ce client. */
export type RetainedMail = {
  id: string;
  subject: string;
  from: string;
  sent_at: string;
  /** Vrai quand il est déjà rattaché à cette fiche. */
  linked: boolean;
};

export type EnrichResult = {
  messages_examined: number;
  model: string;
  seconds: number;
  generated_at: string;
  proposal: {
    email: Finding | null;
    phone: Finding | null;
    address_line: Finding | null;
    postal_code: Finding | null;
    city: Finding | null;
    company_name: Finding | null;
    contacts: FoundContact[];
    summary: string;
    questions: string[];
  };
  /** Les messages retenus, prêts à être rattachés à la fiche. */
  retained: RetainedMail[];
};

/**
 * Deux fiches qui se ressemblent, et de quoi choisir laquelle garder.
 *
 * Les compteurs voyagent avec les noms : personne ne décide laquelle survit
 * sans savoir laquelle porte les affaires, les devis et les courriels.
 */
export type DuplicateSide = {
  id: string;
  name: string;
  status: CustomerStatus;
  email: string;
  phone: string;
  city: string;
  projects: number;
  quotes: number;
  mail: number;
  created_at: string;
};

export type DuplicatePair = {
  left: DuplicateSide;
  right: DuplicateSide;
  /** Similarité des deux intitulés, entre 0 et 1. */
  score: number;
};
