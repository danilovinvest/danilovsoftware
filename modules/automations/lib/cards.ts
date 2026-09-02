import {
  CalendarClockIcon,
  ClockIcon,
  MessageCircleIcon,
  type LucideIcon,
} from "lucide-react";
import type { NodeConfig, NodeType } from "./types";

/**
 * Le catalogue des cartes.
 *
 * Chaque type porte son identité visuelle, sa famille et sa configuration par
 * défaut. Tout est ici plutôt que dispersé entre la palette, la carte et
 * l'inspecteur : ajouter une brique ne doit demander qu'une entrée, pas trois
 * fichiers à retrouver.
 */

export type CardFamily = "declencheur" | "source" | "action";

export type CardKind = {
  type: NodeType;
  label: string;
  hint: string;
  family: CardFamily;
  icon: LucideIcon;
  /** Classes du thème. Aucune couleur littérale : le mode sombre les suit. */
  tone: { chip: string; ring: string };
  defaults: NodeConfig;
};

export const CARDS: CardKind[] = [
  {
    type: "schedule",
    label: "Déclencheur horaire",
    hint: "Quand l'automatisation part. Une seule par graphe.",
    family: "declencheur",
    icon: ClockIcon,
    tone: { chip: "bg-info-soft text-info", ring: "border-info/40" },
    defaults: {},
  },
  {
    type: "calendar_digest",
    label: "Récapitulatif d'agenda",
    hint: "Rassemble les rendez-vous d'une journée et en fait un texte.",
    family: "source",
    icon: CalendarClockIcon,
    tone: { chip: "bg-success-soft text-success", ring: "border-success/40" },
    defaults: { offset_days: 1, calendar_ids: [], empty_text: "" },
  },
  {
    type: "whatsapp",
    label: "Envoi WhatsApp",
    hint: "Envoie le message à un numéro.",
    family: "action",
    icon: MessageCircleIcon,
    tone: { chip: "bg-warning-soft text-warning", ring: "border-warning/40" },
    defaults: {
      to: "",
      mode: "texte",
      message: "{{resume}}",
      template: "",
      language: "fr",
    },
  },
];

export function cardOf(type: NodeType): CardKind {
  return CARDS.find((card) => card.type === type) ?? CARDS[0];
}

export const FAMILY_LABEL: Record<CardFamily, string> = {
  declencheur: "Déclencheur",
  source: "Source",
  action: "Action",
};

/**
 * Les variables qu'une carte met à disposition des suivantes.
 *
 * Affichées dans l'inspecteur : sans elles, `{{resume}}` est un secret que
 * seul le code connaît.
 */
export const VARIABLES: Array<{ name: string; description: string }> = [
  { name: "resume", description: "La journée mise en mots, une ligne par rendez-vous" },
  { name: "date", description: "« jeudi 3 septembre »" },
  { name: "nombre", description: "Le nombre de rendez-vous" },
];

/* --- Expressions cron ------------------------------------------------------ */

/**
 * Quelques rythmes courants, pour ne pas avoir à connaître la syntaxe cron.
 *
 * Le champ reste libre à côté : ces raccourcis couvrent le cas ordinaire sans
 * enfermer celui qui sait écrire « 0 7 * * 1-5 ».
 */
export const CRON_PRESETS: Array<{ value: string; label: string }> = [
  { value: "0 18 * * *", label: "Tous les jours à 18h" },
  { value: "0 8 * * *", label: "Tous les jours à 8h" },
  { value: "0 18 * * 0-4", label: "Du dimanche au jeudi à 18h" },
  { value: "0 18 * * 1-5", label: "En semaine, à 18h" },
  { value: "0 7 * * 1", label: "Le lundi à 7h" },
];

/**
 * Traduit une expression cron simple en français.
 *
 * Volontairement partiel : il couvre ce que les raccourcis produisent et les
 * variantes proches, et rend l'expression telle quelle au-delà. Une traduction
 * approximative serait pire que pas de traduction du tout.
 */
export function describeCron(expression: string): string {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return expression;

  const [minute, hour, dom, month, dow] = parts;
  if (dom !== "*" || month !== "*") return expression;
  if (!/^\d+$/.test(minute) || !/^\d+$/.test(hour)) return expression;

  const time =
    minute === "0" ? `${Number(hour)}h` : `${Number(hour)}h${minute.padStart(2, "0")}`;

  const days: Record<string, string> = {
    "*": "tous les jours",
    "1-5": "du lundi au vendredi",
    "0-4": "du dimanche au jeudi",
    "6,0": "le week-end",
    "0": "le dimanche",
    "1": "le lundi",
    "2": "le mardi",
    "3": "le mercredi",
    "4": "le jeudi",
    "5": "le vendredi",
    "6": "le samedi",
  };
  const when = days[dow];
  return when ? `${when} à ${time}` : expression;
}
