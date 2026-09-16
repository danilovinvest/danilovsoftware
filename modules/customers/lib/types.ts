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
/**
 * Les types d'intervention, dans l'ordre où le dirigeant les a dictés.
 *
 * `renovation` ferme la liste sans avoir été citée : neuf affaires la portent,
 * et une valeur ne se retire pas parce qu'on ne l'a pas nommée.
 */
export type InterventionScope =
  | "ouverture"
  | "tremie"
  | "plancher"
  | "sous_oeuvre"
  | "extension"
  | "sondage"
  | "renforcement"
  | "renovation"
  | "autre";

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
/**
 * La mission d'une affaire du bureau d'études : elle commande son parcours.
 * Nulle en base tant que personne ne tranche — elle se déduit alors des devis.
 */
export type ProjectMission = "etude_structurelle" | "rapport_attestation" | "sondage";

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
  /** Le numéro de dossier, année et rang (`2026-0148`) : le préfixe se lit du métier. */
  reference: string;
  mission: ProjectMission | null;
  promised_at: string | null;
  internal_deadline_at: string | null;
  issuer: string | null;
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
  /**
   * Déduit des pièces, jamais saisi : un devis signé, une facture ou un
   * paiement reçu. Vrai même sur une fiche archivée — archiver ne retire pas la
   * qualité de client.
   */
  is_client: boolean;
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
  /**
   * Déduit des pièces, jamais saisi : un devis signé, une facture ou un
   * paiement reçu. Vrai même sur une fiche archivée — archiver ne retire pas la
   * qualité de client.
   */
  is_client: boolean;
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
  /**
   * Le type d'intervention, dicté par le dirigeant.
   *
   * Il était servi par l'API depuis toujours et **n'a jamais été affiché** :
   * 391 affaires sur 509 n'en portent aucun, faute d'un écran pour le saisir.
   * C'est pourtant lui qui fait le prix, avec le type de bien.
   */
  scope: InterventionScope | null;
  site_address: string;
  site_postal_code: string;
  site_city: string;
  notes: string;
  started_at: string | null;
  closed_at: string | null;
  /** Le dossier OneDrive relié par la copie ; vide sinon. */
  drive_path: string;
  /**
   * Qui suit le dossier, qui calcule, qui dessine.
   *
   * Nuls tant que personne n'est nommé, ce qui est le cas de presque toutes les
   * affaires reprises. Le nom voyage avec l'identifiant : un écran affiche un
   * nom, et aller le chercher coûterait trois requêtes par affaire.
   */
  manager_id: string | null;
  manager_name: string;
  engineer_id: string | null;
  engineer_name: string;
  drafter_id: string | null;
  drafter_name: string;
  /**
   * Le numéro de dossier, posé par la base à la création et jamais réécrit.
   * Seuls l'année et le rang sont stockés — voir `projectReference`.
   */
  reference: string;
  /** Choisie par l'entreprise, ou nulle : elle se déduit alors des devis. */
  mission: ProjectMission | null;
  /**
   * La société de l'affaire, quand l'entreprise l'a choisie ; nulle, elle se lit
   * sur les devis. Elle ne s'écrit que par `setProjectIssuer`, jamais par le
   * formulaire de l'affaire.
   */
  issuer: string | null;
  /** La prochaine action assignée : la tâche ouverte la plus pressante. */
  next_task: NextTask | null;
  /**
   * Qui sous-traite cette affaire, et pour combien. Vide le plus souvent : un
   * chantier fait en interne n'a personne ici.
   */
  subcontractors: ProjectSubcontractor[];
  /** La somme des montants connus, nulle quand aucun n'est renseigné. */
  subcontracting_total: string | null;
  /**
   * Le délai annoncé au client, et la deadline qu'on se donne en interne.
   * L'interne précède l'annoncée ; l'écart entre les deux est la marge.
   */
  promised_at: string | null;
  internal_deadline_at: string | null;
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
   * D'où vient le montant : « manuel » (saisi ou validé par quelqu'un, jamais
   * écrasé par la lecture), « pdf » (lu du document, `amount_evidence` garde la
   * ligne qui le justifie), vide (on ne sait pas).
   */
  amount_source: string;
  amount_read_at: string | null;
  amount_evidence: string;
  /** Pourquoi la lecture n'a rien rendu. Vide quand elle a abouti. */
  amount_read_error: string;
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
  /**
   * Le montant de l'acompte, tel que le client l'a réglé. Il ne se déduit pas
   * du devis — le client le négocie ou le change — et reste nul quand on ne le
   * connaît pas.
   */
  deposit_amount: string | null;
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
  /**
   * Ce qui a été commandé, et pas seulement qu'on a commandé.
   *
   * Des textes libres — « 3 IPE 200 · 4,20 m » — parce que la section et la
   * quantité sont ce qu'on vérifie à la livraison. Les familles proposées à
   * l'écran ne sont que des raccourcis de saisie.
   */
  materials: string[];
  /** Quand reprendre une affaire reportée. */
  resume_at: string | null;
  /** Les plans d'exécution envoyés — le jalon de rendu du bureau d'études. */
  plans_sent_at: string | null;
  pv_sent_at: string | null;
  pv_signed_at: string | null;
  visit_report_sent_at: string | null;
  survey_report_sent_at: string | null;
  /*
    La production du bureau d'études, entre l'acompte et l'envoi.

    Étude structurelle : calcul commencé puis terminé (la note de calcul est
    faite), plans commencés puis rendus au contrôle, corrections demandées,
    dossier définitif. Rapport ou attestation : rédigé, validé, envoyé.
    Sondage : réalisé sur site. Chacune est une date, nulle tant que ce n'est
    pas fait.
  */
  calc_started_at: string | null;
  calc_done_at: string | null;
  plans_started_at: string | null;
  plans_review_at: string | null;
  corrections_at: string | null;
  final_ready_at: string | null;
  report_written_at: string | null;
  report_validated_at: string | null;
  report_sent_at: string | null;
  survey_done_at: string | null;
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
/**
 * Une pièce jointe à un cran de la frise : un document du dossier OneDrive (son
 * lien, jamais le fichier), un courriel de la fiche, une note, la vraie date.
 * Elle prouve le cran sans le cocher.
 */
export type StepProof = {
  id: string;
  project_id: string;
  step: string;
  occurred_at: string | null;
  note: string;
  drive_item_id: string;
  drive_name: string;
  drive_url: string;
  mail_message_id: string | null;
  mail_subject: string;
  mail_from: string;
  mail_sent_at: string | null;
  created_by_name: string;
  created_at: string;
};

/**
 * Ce que rend une preuve déposée dans OneDrive : les preuves créées (une par
 * fichier), et où elles ont été rangées.
 */
export type ProofBatch = {
  proofs: StepProof[];
  folder_path: string;
  folder_url: string;
  folder_created: boolean;
  /** Les pièces jointes non copiées — gardées par leur nom seulement. */
  skipped: string[];
  /** Ce qui n'a pas pu se faire, sans empêcher le reste (OneDrive non raccordé…). */
  warning: string;
};

export type StepProofInput = {
  occurred_at: string | null;
  note: string;
  drive_item_id: string;
  drive_name: string;
  drive_url: string;
  mail_message_id: string | null;
};

export type CustomerDetail = Customer & {
  contacts: Contact[];
  projects: Project[];
  quotes: Quote[];
  interactions: Interaction[];
  milestones: Milestones[];
  /** Les preuves jointes aux crans de la frise, toutes affaires confondues. */
  step_proofs: StepProof[];
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

/**
 * Une affaire vue depuis celui à qui elle est confiée.
 *
 * Le nom du client voyage avec : sans lui, l'écran afficherait « Ouverture d'un
 * mur porteur » sans dire chez qui. Le rôle est calculé par le serveur, qui est
 * le seul à connaître les identifiants qu'il compare.
 */
/**
 * La tâche en cours d'une affaire : sa prochaine action, assignée.
 *
 * La plus pressante des tâches ouvertes qui la ciblent — priorité, puis
 * échéance. Nulle quand personne n'est chargé de rien sur l'affaire.
 */
export type NextTask = {
  id: string;
  title: string;
  status: string;
  priority: "basse" | "normale" | "haute";
  due_at: string | null;
  assignee_id: string | null;
  assignee_name: string;
  is_overdue: boolean;
};

/** Une affaire active sans responsable ou sans prochaine action. */
export type UnassignedProject = {
  id: string;
  reference: string;
  label: string;
  stage: ProjectStage;
  customer_id: string;
  customer_name: string;
  manager_id: string | null;
  manager_name: string;
  next_task: NextTask | null;
  quote_count: number;
  last_activity_at: string | null;
  created_at: string;
  promised_at: string | null;
  internal_deadline_at: string | null;
};

export type UnassignedPage = {
  items: UnassignedProject[];
  total: number;
  without_manager: number;
  without_task: number;
};

export type MyProject = Project & {
  customer_name: string;
  customer_reference: string;
  is_manager: boolean;
  is_engineer: boolean;
  is_drafter: boolean;
};

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
  // Posé par la base à la création, jamais modifiable.
  | "reference"
  // Sa propre route : le formulaire remplace l'affaire et l'effacerait.
  | "issuer"
  // Servie par le serveur, lue des tâches : jamais écrite par l'affaire.
  | "next_task"
  // Leur propre route, comme les jalons : le formulaire les effacerait.
  | "subcontractors"
  | "subcontracting_total"
  // Posé par la copie OneDrive, jamais par un formulaire.
  | "drive_path"
  // Servis avec l'affaire, jamais envoyés : le serveur les déduit des
  // identifiants, et les renvoyer inviterait à les croire modifiables.
  | "manager_name"
  | "engineer_name"
  | "drafter_name"
>;

/**
 * Un sous-traitant régulier de l'entreprise.
 *
 * Quatre au départ — Igor, Alex, Vladimir, Maxime — dans une table plutôt qu'en
 * dur : ils changent, et un nom écrit dans le code ne se corrige pas depuis
 * l'écran.
 */
export type Subcontractor = {
  id: string;
  name: string;
  active: boolean;
};

/** Un sous-traitant posé sur une affaire, avec ce qu'il prend. */
export type ProjectSubcontractor = {
  subcontractor_id: string;
  name: string;
  /** Nul quand on ne connaît pas encore son prix : facultatif, comme le reste. */
  amount: string | null;
};

/** Ce que la suppression d'une affaire emporte, et ce qu'elle garde. */
export type ProjectDeletion = {
  quotes: number;
  /** Les références des factures (FA…) qui partent avec l'affaire. */
  invoices: string[];
  proofs: number;
  milestones: boolean;
  tasks: number;
  realisation: boolean;
  interactions_kept: number;
  events_kept: number;
  drive_path: string;
};

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
  // La provenance d'un montant est un fait du serveur : la lecture des PDF la
  // pose, une correction humaine la reprend. Un formulaire ne l'envoie jamais.
  | "amount_source"
  | "amount_read_at"
  | "amount_evidence"
  | "amount_read_error"
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
