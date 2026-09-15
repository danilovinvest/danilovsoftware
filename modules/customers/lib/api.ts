import { apiFetch, type Paginated } from "@/shared/api/client";
import type {
  Contact,
  ContactPayload,
  Customer,
  CustomerDetail,
  CustomerFilters,
  CustomerListItem,
  PaymentStatus,
  ProofBatch,
  StepProof,
  StepProofInput,
  CustomerPayload,
  CustomerStats,
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

export function getStats(issuer: string, signal?: AbortSignal) {
  return apiFetch<CustomerStats>("/v1/customers/stats", {
    query: { issuer: issuer || undefined },
    signal,
  });
}

export function createCustomer(payload: CustomerPayload) {
  return apiFetch<Customer>("/v1/customers", { method: "POST", body: payload });
}

export function updateCustomer(id: string, payload: CustomerPayload) {
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

export function updateContact(id: string, payload: ContactPayload) {
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

export function updateProject(id: string, payload: ProjectPayload) {
  return apiFetch<Project>(`/v1/projects/${id}`, { method: "PATCH", body: payload });
}

/**
 * Les jalons d'une affaire : ceux d'après-signature, et les crans cochés à la
 * main.
 *
 * **Toutes les dates partent ensemble**, et la route remplace la ligne :
 * l'écran envoie l'état complet, parce qu'une écriture partielle obligerait le
 * serveur à distinguer « pas coché » de « pas envoyé » sur chaque champ. Le
 * revers est qu'un appelant qui oublie un champ l'efface — c'est pourquoi la
 * fiche latérale des chantiers renvoie les cinq marques telles quelles, sans
 * jamais les afficher.
 *
 * La date de chantier n'est pas ici : elle vit dans `Project.started_at` et
 * s'écrit par `updateProject`.
 */
export function setMilestones(
  projectId: string,
  values: {
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
    signed_at: string | null;
  },
) {
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
  payload: { status: PaymentStatus; amount: string | null },
) {
  return apiFetch<Quote>(`/v1/quotes/${id}/deposit`, { method: "PUT", body: payload });
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
export function logReminder(projectId: string, summary?: string) {
  return apiFetch<Interaction>(`/v1/projects/${projectId}/relance`, {
    method: "POST",
    body: summary ? { summary } : undefined,
  });
}
