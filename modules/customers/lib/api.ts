import { apiFetch, type Paginated } from "@/shared/api/client";
import type {
  ClassificationPayload,
  Contact,
  CustomerRelations,
  ContactPayload,
  Customer,
  CustomerDetail,
  CustomerFilters,
  CustomerIssuerChoice,
  CustomerListItem,
  PaymentStatus,
  ProjectDeletion,
  Subcontractor,
  UnassignedPage,
  ProofBatch,
  StepProof,
  StepProofInput,
  CustomerPayload,
  CustomerStats,
  CycleOrderRow,
  Referrer,
  ReferrerCandidate,
  DuplicatePair,
  EnrichResult,
  FoundContact,
  Interaction,
  InteractionPayload,
  Milestones,
  MyProject,
  Project,
  ProjectPayload,
  Quote,
  QuotePayload,
  Review,
  StagePayload,
} from "./types";
import type { CycleStep, Parcours } from "./cycle";

/** Toutes les requêtes du module passent par ici : un seul endroit à relire. */

export function listCustomers(filters: CustomerFilters, signal?: AbortSignal) {
  return apiFetch<Paginated<CustomerListItem>>("/v1/customers", {
    query: {
      search: filters.search,
      status: filters.status,
      source: filters.source,
      city: filters.city,
      owner_id: filters.owner_id,
      cycle: filters.cycle,
      review: filters.review,
      issuer: filters.issuer,
      sort: filters.sort,
      page: filters.page,
      per_page: filters.per_page,
    },
    signal,
  });
}

export function getCustomer(id: string, signal?: AbortSignal) {
  return apiFetch<CustomerDetail>(`/v1/customers/${id}`, { signal });
}

/**
 * Coche ou décoche un cran de relecture.
 *
 * On n'envoie que la case cliquée : le serveur laisse l'autre telle qu'elle
 * est. Envoyer les deux à chaque fois écraserait le geste d'un collègue en
 * train de relire la même fiche.
 */
export function setCustomerReview(
  id: string,
  change: { verified?: boolean; completed?: boolean },
) {
  return apiFetch<Review>(`/v1/customers/${id}/review`, {
    method: "PATCH",
    body: change,
  });
}

/**
 * Client ou prospect, décidé à la main (issue 113).
 *
 * `true` ou `false` l'emporte sur les pièces et n'est plus défait par la
 * promotion automatique ; `null` rend la décision aux pièces.
 */
export function setCustomerClient(id: string, client: boolean | null) {
  return apiFetch<Customer>(`/v1/customers/${id}/client`, { method: "PUT", body: { client } });
}

/**
 * La société de la fiche, décidée à la main.
 *
 * Une société ou « tous » l'emporte sur les devis, partout où la société se
 * lit : le badge **et** le périmètre. `null` rend la décision aux devis.
 */
export function setCustomerIssuer(id: string, issuer: CustomerIssuerChoice | null) {
  return apiFetch<Customer>(`/v1/customers/${id}/issuer`, { method: "PUT", body: { issuer } });
}

export function getStats(issuer: string, signal?: AbortSignal) {
  return apiFetch<CustomerStats>("/v1/customers/stats", {
    query: { issuer: issuer || undefined },
    signal,
  });
}

export function createCustomer(payload: CustomerPayload) {
  return apiFetch<Customer>("/v1/customers", { method: "POST", body: payload });
}

/**
 * Corriger une fiche. **Seuls les champs envoyés changent** : le serveur lit la
 * requête par-dessus la fiche, un champ omis garde sa valeur, `null` efface.
 */
export function updateCustomer(id: string, payload: Partial<CustomerPayload>) {
  return apiFetch<Customer>(`/v1/customers/${id}`, { method: "PATCH", body: payload });
}

/**
 * Les fiches qui se ressemblent, deux à deux.
 *
 * Le seuil est bas par défaut — les vrais doublons du CRM le sont : « Mamakina
 * Olga » et « Olga Mamakina Eze » se ressemblent moins qu'on ne l'imagine. Le
 * prix est du bruit, et le bruit se relit ; l'inverse laisse des doublons
 * invisibles.
 */
export function listDuplicates(minimum = 0.45, signal?: AbortSignal) {
  return apiFetch<{ items: DuplicatePair[] }>(
    `/v1/customers/duplicates?minimum=${minimum}`,
    { signal },
  );
}

/**
 * Verse `absorbed` dans `keep`, et retire `absorbed`.
 *
 * C'est `keep` qui est dans le chemin parce que c'est la fiche sur laquelle on
 * agit — celle qui reste. Tout ou rien côté serveur.
 */
/** « Pas un doublon » : la paire ne revient plus dans la liste. */
export function dismissDuplicate(leftId: string, rightId: string) {
  return apiFetch<void>("/v1/customers/duplicates/dismiss", {
    method: "POST",
    body: { left_id: leftId, right_id: rightId },
  });
}

export function mergeCustomers(keep: string, absorbed: string) {
  return apiFetch<Customer>(`/v1/customers/${keep}/merge`, {
    method: "POST",
    body: { absorbed },
  });
}

/**
 * Efface une fiche pour de bon, elle et ce qui n'appartient qu'à elle.
 *
 * `deleteCustomer` **archive** : la fiche sort des listes et reste retrouvable
 * par la recherche globale, ce qui est le bon geste pour un client qu'on
 * écarte. Ce n'en est pas un pour une fiche née d'une faute de frappe, qui
 * continuait de remonter dans la palette sans qu'aucun écran ne sache
 * l'effacer.
 *
 * Les projets, devis, interlocuteurs et échanges partent avec elle ; les
 * courriels et les rendez-vous sont seulement **détachés** — ils appartiennent
 * à la boîte et à l'agenda, qui lui survivent.
 */
export function purgeCustomer(id: string) {
  return apiFetch<void>(`/v1/customers/${id}/purge`, { method: "DELETE" });
}

export function deleteCustomer(id: string) {
  return apiFetch<void>(`/v1/customers/${id}`, { method: "DELETE" });
}

// --- Interlocuteurs ---------------------------------------------------------

export function createContact(customerId: string, payload: ContactPayload) {
  return apiFetch<Contact>(`/v1/customers/${customerId}/contacts`, {
    method: "POST",
    body: payload,
  });
}

export function updateContact(id: string, payload: Partial<ContactPayload>) {
  return apiFetch<Contact>(`/v1/contacts/${id}`, { method: "PATCH", body: payload });
}

export function deleteContact(id: string) {
  return apiFetch<void>(`/v1/contacts/${id}`, { method: "DELETE" });
}

// --- Projets ----------------------------------------------------------------

export function createProject(customerId: string, payload: ProjectPayload) {
  return apiFetch<Project>(`/v1/customers/${customerId}/projects`, {
    method: "POST",
    body: payload,
  });
}

/**
 * Corriger une affaire. **Seuls les champs envoyés changent**, comme pour la
 * fiche : un écran qui réserve une date n'envoie que `started_at`, et ne peut
 * plus effacer le type de bien ni écraser ce qu'un autre écran vient d'écrire.
 */
export function updateProject(id: string, payload: Partial<ProjectPayload>) {
  return apiFetch<Project>(`/v1/projects/${id}`, { method: "PATCH", body: payload });
}

/** Les jalons et les marques d'une affaire, tels qu'ils s'écrivent. */
export type MilestonesPayload = {
  rib_sent_at: string | null;
  insurance_sent_at: string | null;
  materials_ordered_at: string | null;
  materials: string[];
  resume_at: string | null;
  plans_sent_at: string | null;
  review_requested_at: string | null;
  review_received_at: string | null;
  pv_sent_at: string | null;
  pv_signed_at: string | null;
  visit_report_sent_at: string | null;
  survey_report_sent_at: string | null;
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
  contact_at: string | null;
  rdv_at: string | null;
  quote_sent_at: string | null;
  negotiation_at: string | null;
  negotiation_note: string;
  signed_at: string | null;
};

/** Les clés écrivables des jalons, pour trier un geste avant de l'envoyer. */
export const MILESTONE_KEYS = [
  "rib_sent_at", "insurance_sent_at", "materials_ordered_at", "materials", "resume_at",
  "plans_sent_at", "review_requested_at", "review_received_at", "pv_sent_at", "pv_signed_at",
  "visit_report_sent_at", "survey_report_sent_at", "calc_started_at", "calc_done_at",
  "plans_started_at", "plans_review_at", "corrections_at", "final_ready_at",
  "report_written_at", "report_validated_at", "report_sent_at", "survey_done_at",
  "contact_at", "rdv_at", "quote_sent_at", "negotiation_at", "negotiation_note", "signed_at",
] as const satisfies readonly (keyof MilestonesPayload)[];

/**
 * Les jalons d'une affaire : ceux d'après-signature, et les crans cochés à la
 * main.
 *
 * **Seules les dates envoyées changent** : une date omise garde sa valeur,
 * `null` l'efface. Chaque écran envoyait l'état complet qu'il avait lu, si bien
 * que la fiche latérale d'un chantier, chargée avec sa liste, décochait ce
 * qu'on venait de cocher sur la fiche client. Il n'envoie plus que la case
 * touchée.
 *
 * La date de chantier n'est pas ici : elle vit dans `Project.started_at` et
 * s'écrit par `updateProject`.
 */
export function setMilestones(projectId: string, values: Partial<MilestonesPayload>) {
  return apiFetch<Milestones>(`/v1/projects/${projectId}/milestones`, {
    method: "PUT",
    body: values,
  });
}

/**
 * Les affaires qui me sont confiées, et le rôle que j'y tiens.
 *
 * L'identité vient du jeton, jamais d'un paramètre : personne ne lit les
 * dossiers d'un autre par cette route.
 */
export function listMyProjects(limit = 100, signal?: AbortSignal) {
  return apiFetch<{ items: MyProject[] }>(`/v1/projects/mine?limit=${limit}`, { signal });
}

/** Changer la société d'une affaire, et celle de ses devis si on le demande. */
export function setProjectIssuer(id: string, payload: { issuer: string | null; reassign_quotes: boolean }) {
  return apiFetch<Project>(`/v1/projects/${id}/issuer`, { method: "PUT", body: payload });
}

/** Le bilan de fin d'un chantier : la date de fin, le PV, le solde. */
export type ClosurePayload = {
  closed: boolean;
  /** Le jour réel de fin des travaux, obligatoire pour clôturer. */
  finished_at?: string | null;
  /** Le procès-verbal de réception, facultatif — il s'ajoute, il n'efface rien. */
  pv_sent_at?: string | null;
  pv_signed_at?: string | null;
  /** Le solde va sur le devis qui porte le règlement, jamais sur l'affaire. */
  balance?: { quote_id: string; amount: string | null; paid_at?: string } | null;
};

/**
 * Termine un chantier, ou le rouvre.
 *
 * Une seule route pour trois faits qui se décident au même moment : le serveur
 * les écrit en une transaction, si bien qu'une coupure ne laisse jamais un
 * chantier terminé dont le solde n'est pas passé. Rouvrir (`closed: false`) ne
 * retire que la date de fin — le PV et le solde se sont produits.
 */
export function closeProject(id: string, payload: ClosurePayload) {
  return apiFetch<Project>(`/v1/projects/${id}/closure`, { method: "PUT", body: payload });
}

/** L'inventaire de ce que la suppression d'une affaire emporte. */
export function getProjectDeletion(id: string, signal?: AbortSignal) {
  return apiFetch<ProjectDeletion>(`/v1/projects/${id}/deletion`, { signal });
}

/** Les sous-traitants réguliers de l'entreprise. */
/**
 * L'ordre des crans des frises, un par parcours réordonné.
 *
 * Un parcours absent de la liste suit l'ordre par défaut : il n'y a pas de
 * copie de cet ordre-là en base.
 */
export function listCycleOrders(signal?: AbortSignal) {
  return apiFetch<CycleOrderRow[]>("/v1/cycle-orders", { signal });
}

export function setCycleOrder(parcours: Parcours, steps: CycleStep[]) {
  return apiFetch<CycleOrderRow>(`/v1/cycle-orders/${parcours}`, {
    method: "PUT",
    body: { steps },
  });
}

/** Rétablit l'ordre par défaut, en retirant l'ordre choisi. */
export function resetCycleOrder(parcours: Parcours) {
  return apiFetch<void>(`/v1/cycle-orders/${parcours}`, { method: "DELETE" });
}

/** Tout ce qui peut avoir recommandé un client : fiches, archives comprises, et interlocuteurs. */
export function searchReferrers(q: string, exclude: string | null, signal?: AbortSignal) {
  return apiFetch<ReferrerCandidate[]>("/v1/referrers", {
    query: { q, exclude: exclude ?? undefined },
    signal,
  });
}

/** Pose ou retire le parrain. Sa propre route : le formulaire de la fiche l'effacerait. */
export function setCustomerReferrer(
  id: string,
  referrer: Pick<Referrer, "kind" | "id"> | null,
) {
  return apiFetch<{ referrer: Referrer | null }>(`/v1/customers/${id}/referrer`, {
    method: "PUT",
    body: {
      customer_id: referrer?.kind === "fiche" ? referrer.id : null,
      contact_id: referrer?.kind === "interlocuteur" ? referrer.id : null,
    },
  });
}

/**
 * La relation, le SIRET et le syndic d'une fiche. Leur propre route : le
 * formulaire de la fiche remplace la ligne entière et les effacerait. Un champ
 * omis garde sa valeur, `null` retire, `""` vide le SIRET.
 */
export function setCustomerClassification(id: string, body: ClassificationPayload) {
  return apiFetch<Customer>(`/v1/customers/${id}/classification`, { method: "PUT", body });
}

/** Le second cercle de la fiche, pour la vue graphe. */
export function getCustomerRelations(id: string, signal?: AbortSignal) {
  return apiFetch<CustomerRelations>(`/v1/customers/${id}/relations`, { signal });
}

/** Qui a apporté l'affaire — nul le retire. */
export function setProjectReferrer(projectId: string, customerId: string | null) {
  return apiFetch<void>(`/v1/projects/${projectId}/referrer`, {
    method: "PUT",
    body: { customer_id: customerId },
  });
}

export function listSubcontractors(signal?: AbortSignal) {
  return apiFetch<{ items: Subcontractor[] }>("/v1/subcontractors", { signal });
}

/**
 * Qui sous-traite une affaire, et pour combien.
 *
 * La route **remplace la liste entière**, comme celle des jalons : l'écran
 * envoie l'état complet, et une écriture partielle obligerait à distinguer
 * « retiré » de « non envoyé ».
 */
export function setProjectSubcontractors(
  projectId: string,
  items: Array<{ subcontractor_id: string; amount: string | null }>,
) {
  return apiFetch<Project>(`/v1/projects/${projectId}/subcontractors`, {
    method: "PUT",
    body: { items },
  });
}

/** Poser le responsable d'une affaire, sans renvoyer l'affaire entière. */
export function setProjectManager(id: string, managerId: string | null) {
  return apiFetch<Project>(`/v1/projects/${id}/manager`, { method: "PUT", body: { manager_id: managerId } });
}

/** Les affaires actives sans responsable ou sans prochaine action. */
export function listUnassigned(
  params: { limit?: number; offset?: number; issuer?: string },
  signal?: AbortSignal,
) {
  return apiFetch<UnassignedPage>("/v1/projects/unassigned", { query: params, signal });
}

/**
 * Archiver une affaire, ou la désarchiver (issue 115). Rien d'autre ne bouge :
 * ni l'étape, ni les devis.
 */
export function setProjectArchived(id: string, archived: boolean) {
  return apiFetch<Project>(`/v1/projects/${id}/archive`, { method: "PUT", body: { archived } });
}

export function deleteProject(id: string) {
  return apiFetch<void>(`/v1/projects/${id}`, { method: "DELETE" });
}

// --- Devis ------------------------------------------------------------------

export function createQuote(projectId: string, payload: QuotePayload) {
  return apiFetch<Quote>(`/v1/projects/${projectId}/quotes`, {
    method: "POST",
    body: payload,
  });
}

export function updateQuote(id: string, payload: QuotePayload) {
  return apiFetch<Quote>(`/v1/quotes/${id}`, { method: "PATCH", body: payload });
}

/**
 * L'acompte seul : statut et montant.
 *
 * Encaisser depuis la frise ou un chantier ne renvoie plus le devis entier —
 * les écrans qui ne le connaissaient pas en effaçaient une partie.
 */
export function setQuoteDeposit(
  id: string,
  /** `paid_at` (AAAA-MM-JJ) corrige le jour de l'encaissement ; absent, il ne change pas. */
  payload: { status: PaymentStatus; amount: string | null; paid_at?: string },
) {
  return apiFetch<Quote>(`/v1/quotes/${id}/deposit`, { method: "PUT", body: payload });
}

/**
 * Le solde seul : statut et montant.
 *
 * Le jumeau de la route d'acompte, et il manquait : solder passait par le
 * remplacement complet du devis, ce que cette paire de routes existe
 * précisément pour éviter.
 */
export function setQuoteBalance(
  id: string,
  /** `paid_at` (AAAA-MM-JJ) corrige le jour de l'encaissement ; absent, il ne change pas. */
  payload: { status: PaymentStatus; amount: string | null; paid_at?: string },
) {
  return apiFetch<Quote>(`/v1/quotes/${id}/balance`, { method: "PUT", body: payload });
}

/**
 * Ajouter un virement à un règlement.
 *
 * Rend le devis mis à jour : son montant suit la somme de ses virements, et
 * l'écran doit pouvoir l'afficher sans recharger la fiche entière.
 */
export function addQuotePayment(
  quoteId: string,
  payload: { paid_at: string; amount: string; reference?: string; kind?: "acompte" | "solde" },
) {
  return apiFetch<Quote>(`/v1/quotes/${quoteId}/payments`, { method: "POST", body: payload });
}

/**
 * Retirer un virement. Retirer le dernier rend le montant du devis à vide : la
 * somme d'aucune ligne n'est pas zéro euro, c'est « on ne sait plus ».
 */
export function removeQuotePayment(quoteId: string, paymentId: string) {
  return apiFetch<Quote>(`/v1/quotes/${quoteId}/payments/${paymentId}`, { method: "DELETE" });
}

/**
 * Joindre une preuve à un cran. Elle ne coche pas le cran : l'état reste celui
 * des faits et des marques, et l'écran fait les deux gestes s'il le faut.
 */
export function createStepProof(projectId: string, payload: StepProofInput & { step: string }) {
  return apiFetch<StepProof>(`/v1/projects/${projectId}/proofs`, { method: "POST", body: payload });
}

/**
 * Déposer un fichier en preuve : il part dans le dossier OneDrive de l'affaire,
 * dans le sous-dossier du thème du cran, puis la preuve pointe vers lui.
 */
export function uploadStepProof(projectId: string, step: string, input: StepProofInput, file: File) {
  const form = new FormData();
  form.append("file", file);
  form.append("step", step);
  if (input.occurred_at) form.append("occurred_at", input.occurred_at);
  form.append("note", input.note);
  return apiFetch<ProofBatch>(`/v1/projects/${projectId}/proofs/upload`, { method: "POST", body: form });
}

/** Joindre un courriel : ses pièces jointes sont copiées au même endroit. */
export function createMailStepProof(projectId: string, payload: StepProofInput & { step: string }) {
  return apiFetch<ProofBatch>(`/v1/projects/${projectId}/proofs/mail`, {
    method: "POST",
    body: {
      step: payload.step,
      occurred_at: payload.occurred_at,
      note: payload.note,
      mail_message_id: payload.mail_message_id,
    },
  });
}

export function deleteStepProof(id: string) {
  return apiFetch<void>(`/v1/proofs/${id}`, { method: "DELETE" });
}

export function deleteQuote(id: string) {
  return apiFetch<void>(`/v1/quotes/${id}`, { method: "DELETE" });
}

// --- Échanges ---------------------------------------------------------------

/**
 * La taille d'une page d'historique. C'est aussi ce que la fiche en sert
 * (`detailInteractionLimit` côté API) : la page 2 commence donc exactement là
 * où la fiche s'arrête.
 */
export const INTERACTIONS_PAGE_SIZE = 50;

/** Une page de l'historique d'une fiche, du plus récent au plus ancien. */
export function listInteractions(customerId: string, page: number) {
  return apiFetch<Paginated<Interaction>>(`/v1/customers/${customerId}/interactions`, {
    query: { page, per_page: INTERACTIONS_PAGE_SIZE },
  });
}

export function createInteraction(customerId: string, payload: InteractionPayload) {
  return apiFetch<Interaction>(`/v1/customers/${customerId}/interactions`, {
    method: "POST",
    body: payload,
  });
}

export function deleteInteraction(id: string) {
  return apiFetch<void>(`/v1/interactions/${id}`, { method: "DELETE" });
}

/** Change l'avancement d'une affaire sans réécrire le reste de sa fiche. */
/**
 * Fait lire les courriels du client par le modèle.
 *
 * Rien n'est écrit : la route rend une proposition. L'appel prend des dizaines
 * de secondes — le modèle lit vingt-cinq messages — d'où l'absence de délai
 * côté client.
 */
export function enrichFromMail(customerId: string) {
  return apiFetch<EnrichResult>(`/v1/customers/${customerId}/enrich`, { method: "POST" });
}

/**
 * Applique ce que le modèle a trouvé et que l'écran a laissé cocher.
 *
 * Deux gestes que la recherche par adresse ne sait pas faire : rattacher un fil
 * où le client est seulement en copie, et nommer les intervenants du chantier —
 * ingénieur béton, architecte, syndic — qui n'existaient nulle part.
 */
export function applyEnrichment(
  customerId: string,
  input: { message_ids: string[]; contacts: FoundContact[] },
) {
  return apiFetch<{ messages: number; contacts: number }>(
    `/v1/customers/${customerId}/enrich/apply`,
    { method: "POST", body: input },
  );
}

export function setProjectStage(id: string, payload: StagePayload) {
  return apiFetch<Project>(`/v1/projects/${id}/stage`, {
    method: "PATCH",
    body: payload,
  });
}

/**
 * Horodate une relance. La date est posée par le serveur : le bouton n'envoie
 * rien d'autre qu'un commentaire optionnel.
 */
export function logReminder(projectId: string, summary?: string, details?: string) {
  return apiFetch<Interaction>(`/v1/projects/${projectId}/relance`, {
    method: "POST",
    body: summary || details ? { summary, details } : undefined,
  });
}
