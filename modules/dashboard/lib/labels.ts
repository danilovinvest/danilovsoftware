import type { Tone } from "@/modules/customers";
import type { Health, Period } from "./types";

/**
 * Libellés propres au tableau de bord. Les énumérations du domaine — étape,
 * statut de fiche, type de devis — gardent les leurs dans le module « fiches
 * client » : rien n'est traduit deux fois.
 */

export const HEALTH: Record<Health, { label: string; tone: Tone; hint: string }> = {
  chaud: {
    label: "Chaud",
    tone: "success",
    hint: "Devis parti il y a moins de trois semaines",
  },
  a_relancer: {
    label: "À relancer",
    tone: "danger",
    hint: "Devis en attente depuis plus de trois semaines",
  },
  dormant: {
    label: "Dormant",
    tone: "neutral",
    hint: "Devis en attente depuis plus de six mois",
  },
  gagne: { label: "Signé", tone: "info", hint: "Plus aucun devis en attente" },
  en_cours: { label: "En cours", tone: "info", hint: "" },
};

export const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "30j", label: "30 jours" },
  { value: "90j", label: "90 jours" },
  { value: "12m", label: "12 mois" },
];

/** Statut brut de l'export, affiché tel quel à côté de l'étape déduite. */
export const SOURCE_STATUS: Record<string, string> = {
  etude: "etude",
  accepte: "accepte",
  facture: "facture",
};

/** Tonalité d'un score 0-100, dans le sens « plus c'est haut, plus ça presse ». */
export function scoreTone(score: number): Tone {
  if (score >= 70) return "danger";
  if (score >= 50) return "warning";
  if (score >= 30) return "info";
  return "neutral";
}

/** Même échelle, sens inverse : un score haut est une bonne nouvelle. */
export function heatTone(score: number): Tone {
  if (score >= 70) return "success";
  if (score >= 50) return "info";
  return "neutral";
}
