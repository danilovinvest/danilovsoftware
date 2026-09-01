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

/**
 * Montants arrondis à l'euro.
 *
 * Le reste du CRM affiche les centimes — un devis se lit au centime près. Un
 * tableau de bord additionne des dizaines de lignes : « 148 350 € » se compare
 * d'un coup d'œil, « 148 350,00 € » se déchiffre.
 */
const euroFormat = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function euros(value: number): string {
  return euroFormat.format(value);
}

/** Forme courte pour les axes et les pastilles : 42 000 € → 42 k€. */
export function eurosShort(value: number): string {
  if (value === 0) return "—";
  if (Math.abs(value) < 1000) return `${Math.round(value)} €`;
  const thousands = value / 1000;
  const digits = Math.abs(thousands) < 10 ? 1 : 0;
  return `${thousands.toFixed(digits).replace(".", ",")} k€`;
}

/** Phrase complète : « hier » ne se préfixe pas de « il y a ». */
export function agoLabel(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 31) return `il y a ${days} j`;
  return `il y a ${Math.round(days / 30)} mois`;
}

/** Forme courte pour les colonnes de tableau, sans « il y a ». */
export function sinceDays(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 31) return `${days} j`;
  const months = Math.round(days / 30);
  return `${months} mois`;
}

/** Accord au pluriel — « 1 relances » saute aux yeux dans un tableau de bord. */
export function plural(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count > 1 ? plural : singular}`;
}
