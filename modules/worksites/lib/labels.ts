import type { Tone } from "@/modules/customers";
import type { StudyStatus, WorksiteStatus } from "./types";

/**
 * Les quatre colonnes du tableau, dans l'ordre du chantier.
 *
 * Il y en avait six : « en attente », « réception » et « clôturé » supposaient
 * un motif de blocage, un PV de réception et un solde encaissé — trois choses
 * que le CRM ne suit pas. Elles sont tombées avec le jeu de démonstration.
 *
 * « Réalisé » est la fin dont on dispose : c'est l'étape commerciale de
 * l'affaire, et aucune des cent dix affaires signées ne porte de date de
 * clôture.
 */
export const WORKSITE_STATUS: Record<
  WorksiteStatus,
  { label: string; tone: Tone }
> = {
  a_planifier: { label: "À planifier", tone: "warning" },
  planifie: { label: "Planifié", tone: "info" },
  en_cours: { label: "En cours", tone: "success" },
  realise: { label: "Réalisé", tone: "neutral" },
};

/** Bordure gauche d'une carte : l'état se voit sans lire le libellé. */
export const STATUS_RAIL: Record<WorksiteStatus, string> = {
  a_planifier: "border-l-warning",
  planifie: "border-l-info",
  en_cours: "border-l-success",
  realise: "border-l-neutral",
};

/**
 * Les quatre crans d'une étude.
 *
 * Ils suivent l'argent : rien ne commence avant l'acompte, rien n'est fini
 * avant le solde, et entre les deux le seul jalon qui compte est le rendu des
 * plans. Proposer « à planifier » à une étude n'aurait aucun sens — un bureau
 * d'études ne réserve pas de date, il produit.
 */
export const STUDY_STATUS: Record<StudyStatus, { label: string; tone: Tone }> = {
  acompte_attendu: { label: "Acompte attendu", tone: "warning" },
  en_cours: { label: "En production", tone: "info" },
  rendue: { label: "Plans rendus", tone: "success" },
  soldee: { label: "Soldée", tone: "neutral" },
};

export const STUDY_RAIL: Record<StudyStatus, string> = {
  acompte_attendu: "border-l-warning",
  en_cours: "border-l-info",
  rendue: "border-l-success",
  soldee: "border-l-neutral",
};
