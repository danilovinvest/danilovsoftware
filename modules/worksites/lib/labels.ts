import type { Tone } from "@/modules/customers";
import type { BlockedReason, CostKind, StudyStatus, WorksiteStatus } from "./types";

type Entry<T extends string> = Record<T, { label: string; tone: Tone }>;

/**
 * Les six colonnes du tableau, dans l'ordre du chantier.
 *
 * « Réception » n'est pas la fin : un chantier est clos quand le PV est signé
 * **et** le solde encaissé. C'est ce que le classeur « CYCLE CHANTIER » dit
 * sans le nommer, en enchaînant PV de réception → facture de solde → avis
 * client. La colonne « Réception » est donc celle où dort l'argent.
 */
export const WORKSITE_STATUS: Entry<WorksiteStatus> = {
  a_planifier: { label: "À planifier", tone: "neutral" },
  planifie: { label: "Planifié", tone: "info" },
  en_cours: { label: "En cours", tone: "success" },
  en_attente: { label: "En attente", tone: "warning" },
  reception: { label: "Réception", tone: "warning" },
  cloture: { label: "Clôturé", tone: "neutral" },
};

export const STATUS_ORDER: WorksiteStatus[] = [
  "a_planifier",
  "planifie",
  "en_cours",
  "en_attente",
  "reception",
  "cloture",
];

export const BLOCKED_REASON: Entry<BlockedReason> = {
  elements: { label: "En attente d'éléments du client", tone: "warning" },
  sondages: { label: "En attente de sondages", tone: "warning" },
  tiers: { label: "Bloqué par un tiers", tone: "warning" },
  client: { label: "Reporté par le client", tone: "neutral" },
  meteo: { label: "Interrompu — météo", tone: "neutral" },
};

/** État de l'étude : propre à l'ingénierie, distinct de l'avancement du chantier. */
export const STUDY_STATUS: Entry<StudyStatus> = {
  en_cours: { label: "Étude en cours", tone: "info" },
  en_attente_elements: { label: "En attente d'éléments", tone: "warning" },
  en_attente_sondages: { label: "En attente de sondages", tone: "warning" },
  termine: { label: "Étude terminée", tone: "success" },
};

export const COST_KIND: Record<CostKind, string> = {
  sous_traitance: "Sous-traitance",
  materiaux: "Matériaux",
  autre: "Autre",
};

/** Bordure gauche d'une carte : l'état se voit sans lire le libellé. */
export const STATUS_RAIL: Record<WorksiteStatus, string> = {
  a_planifier: "border-l-neutral",
  planifie: "border-l-info",
  en_cours: "border-l-success",
  en_attente: "border-l-warning",
  reception: "border-l-warning",
  cloture: "border-l-neutral",
};

/** Tonalité d'une marge : sous 20 %, un chantier de travaux ne paie plus. */
export function marginTone(rate: number): Tone {
  if (rate >= 35) return "success";
  if (rate >= 20) return "info";
  if (rate > 0) return "warning";
  return "danger";
}
