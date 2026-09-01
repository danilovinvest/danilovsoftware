import type {
  CustomerKind,
  CustomerSource,
  CustomerStatus,
  InteractionKind,
  PaymentStatus,
  ProjectStatus,
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

export const PROJECT_STATUS: Entry<ProjectStatus> = {
  a_qualifier: { label: "À qualifier", tone: "neutral" },
  en_cours: { label: "En cours", tone: "info" },
  termine: { label: "Terminé", tone: "success" },
  sans_suite: { label: "Sans suite", tone: "warning" },
  annule: { label: "Annulé", tone: "danger" },
};

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
