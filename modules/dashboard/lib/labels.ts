import {
  CalendarIcon,
  DrillIcon,
  FileTextIcon,
  HardHatIcon,
  PhoneIcon,
  RulerIcon,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/modules/customers";
import type { AgendaEvent, CashRow, Health } from "./types";

/**
 * Libellés et tonalités propres au tableau de bord. Les énumérations du
 * domaine (étape, issue, statut de devis) gardent les leurs dans le module
 * « fiches client » : rien n'est traduit deux fois.
 */

export const HEALTH: Record<Health, { label: string; tone: Tone; short: string }> = {
  a_relancer: { label: "À relancer", tone: "danger", short: "Relance" },
  chaud: { label: "Chaud", tone: "success", short: "Chaud" },
  en_cours: { label: "En cours", tone: "info", short: "En cours" },
  gagne: { label: "Signé", tone: "success", short: "Signé" },
  dormant: { label: "Dormant", tone: "neutral", short: "Dormant" },
};

export const AGENDA_KIND: Record<
  AgendaEvent["kind"],
  { label: string; icon: LucideIcon; tone: Tone }
> = {
  rdv: { label: "Rendez-vous", icon: CalendarIcon, tone: "info" },
  etude: { label: "Étude", icon: RulerIcon, tone: "warning" },
  relance: { label: "Relance", icon: PhoneIcon, tone: "danger" },
  devis: { label: "Devis", icon: FileTextIcon, tone: "neutral" },
  chantier: { label: "Chantier", icon: HardHatIcon, tone: "success" },
};

export const WAITING: Record<CashRow["waiting_for"], { label: string; tone: Tone }> = {
  reponse: { label: "Réponse client", tone: "info" },
  acompte: { label: "Acompte", tone: "warning" },
  solde: { label: "Solde", tone: "danger" },
};

/** Icône du fil d'activité, quand la tonalité seule ne suffit pas. */
export const SONDAGE_ICON = DrillIcon;

export const PERIODS: Array<{ value: "30j" | "90j" | "12m"; label: string }> = [
  { value: "30j", label: "30 jours" },
  { value: "90j", label: "90 jours" },
  { value: "12m", label: "12 mois" },
];

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
