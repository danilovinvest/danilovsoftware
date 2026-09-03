import {
  CalendarClockIcon,
  ClockIcon,
  SendIcon,
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
    type: "telegram",
    label: "Envoi Telegram",
    hint: "Envoie le message dans une conversation du bot.",
    family: "action",
    icon: SendIcon,
    tone: { chip: "bg-info-soft text-info", ring: "border-info/40" },
    defaults: {
      chat_id: "",
      message: "{{resume}}",
      parse_mode: "texte",
      silent: false,
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
