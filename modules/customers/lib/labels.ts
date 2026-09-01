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
} from "./types";

/**
 * Traduction des énumérations de l'API. L'API transporte des identifiants
 * stables en ASCII ; le français vit uniquement ici, donc renommer un libellé
 * ne touche jamais la base.
 */

/** Tonalité d'une pastille de statut, résolue en classes par <EnumBadge>. */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

type Entry<T extends string> = Record<T, { label: string; tone: Tone }>;

export const CUSTOMER_STATUS: Entry<CustomerStatus> = {
  prospect: { label: "Prospect", tone: "info" },
  client: { label: "Client", tone: "success" },
  perdu: { label: "Perdu", tone: "danger" },
  archive: { label: "Archivé", tone: "neutral" },
};

export const CUSTOMER_SOURCE: Entry<CustomerSource> = {
  site_web: { label: "Site web", tone: "neutral" },
  telephone: { label: "Téléphone", tone: "neutral" },
  email: { label: "E-mail", tone: "neutral" },
  recommandation: { label: "Recommandation", tone: "neutral" },
  autre: { label: "Autre", tone: "neutral" },
};

export const CUSTOMER_KIND: Entry<CustomerKind> = {
  particulier: { label: "Particulier", tone: "neutral" },
  societe: { label: "Société", tone: "neutral" },
  syndic: { label: "Syndic", tone: "neutral" },
  architecte: { label: "Architecte", tone: "neutral" },
  autre: { label: "Autre", tone: "neutral" },
};

/**
 * Étapes dans l'ordre du pipeline. L'ordre de déclaration fait foi : il sert
 * aussi bien aux listes déroulantes qu'à l'indicateur d'avancement.
 */
export const PROJECT_STAGE: Entry<ProjectStage> = {
  demande_recue: { label: "Demande reçue", tone: "neutral" },
  qualification: { label: "Qualification", tone: "neutral" },
  rdv_planifie: { label: "RDV planifié", tone: "info" },
  etude_a_produire: { label: "Étude à produire", tone: "warning" },
  proposition_envoyee: { label: "Proposition envoyée", tone: "info" },
  devis_envoye: { label: "Devis envoyé", tone: "info" },
  gagne: { label: "Gagné", tone: "success" },
  realise: { label: "Réalisé", tone: "success" },
};

export const STAGE_ORDER = Object.keys(PROJECT_STAGE) as ProjectStage[];

/**
 * Issues possibles. Les cinq premières closent l'affaire, les deux dernières
 * la suspendent — c'est l'API qui fait autorité sur cette répartition
 * (project_outcomes_closing / _pausing), reprise ici pour la couleur.
 */
export const PROJECT_OUTCOME: Entry<ProjectOutcome> = {
  sans_reponse: { label: "Sans réponse", tone: "danger" },
  sans_suite: { label: "Sans suite", tone: "danger" },
  concurrence: { label: "Autre BET choisi", tone: "danger" },
  refuse_par_nous: { label: "Refusé de notre côté", tone: "danger" },
  transfere: { label: "Transféré à un confrère", tone: "neutral" },
  stand_by: { label: "Stand by client", tone: "warning" },
  bloque_tiers: { label: "Bloqué par un tiers", tone: "warning" },
};

/** Une affaire suspendue reviendra ; une affaire close est terminée. */
export const PAUSING_OUTCOMES: ProjectOutcome[] = ["stand_by", "bloque_tiers"];

export function isPaused(outcome: ProjectOutcome | null): boolean {
  return outcome !== null && PAUSING_OUTCOMES.includes(outcome);
}

export const QUOTE_KIND: Entry<QuoteKind> = {
  etude: { label: "Étude", tone: "neutral" },
  sondages: { label: "Sondages", tone: "neutral" },
  travaux: { label: "Travaux", tone: "neutral" },
  attestation: { label: "Attestation", tone: "neutral" },
  autre: { label: "Autre", tone: "neutral" },
};

export const QUOTE_STATUS: Entry<QuoteStatus> = {
  a_faire: { label: "À faire", tone: "warning" },
  envoye: { label: "Envoyé", tone: "info" },
  accepte: { label: "Accepté", tone: "success" },
  realise: { label: "Réalisé", tone: "success" },
  refuse: { label: "Refusé", tone: "danger" },
  annule: { label: "Annulé", tone: "danger" },
};

export const PAYMENT_STATUS: Entry<PaymentStatus> = {
  non_applicable: { label: "—", tone: "neutral" },
  en_attente: { label: "En attente", tone: "warning" },
  recu: { label: "Reçu", tone: "success" },
};

export const INTERACTION_KIND: Entry<InteractionKind> = {
  appel: { label: "Appel", tone: "neutral" },
  email: { label: "E-mail", tone: "neutral" },
  relance: { label: "Relance", tone: "warning" },
  rdv: { label: "Rendez-vous", tone: "info" },
  rapport: { label: "Rapport", tone: "success" },
  devis: { label: "Devis", tone: "info" },
  note: { label: "Note", tone: "neutral" },
};

export const SORT_OPTIONS = [
  { value: "recent", label: "Plus récentes" },
  { value: "name", label: "Nom (A→Z)" },
  { value: "updated", label: "Dernière modification" },
  { value: "requested", label: "Date de demande" },
];

/** Transforme un dictionnaire de libellés en options de <select>. */
export function toOptions<T extends string>(entries: Entry<T>) {
  return (Object.entries(entries) as Array<[T, { label: string }]>).map(
    ([value, { label }]) => ({ value, label }),
  );
}
