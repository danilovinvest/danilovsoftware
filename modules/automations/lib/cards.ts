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
/**
 * Les variables citables dans un message.
 *
 * Les premières valent toujours ; les suivantes n'ont de sens qu'en envoi
 * découpé, où le gabarit est rendu une fois par rendez-vous. En message unique
 * elles resteraient écrites telles quelles — c'est voulu : on voit dans le
 * message ce qui n'a pas été compris, plutôt que de recevoir un texte troué.
 */
export const VARIABLES: Array<{ name: string; description: string; perEvent?: boolean }> = [
  { name: "resume", description: "La journée entière, un bloc par rendez-vous" },
  { name: "date", description: "« jeudi 3 septembre »" },
  { name: "nombre", description: "Le nombre de rendez-vous" },
  { name: "ligne", description: "Le rendez-vous mis en forme", perEvent: true },
  { name: "heure", description: "« 10h », « 14h30 »", perEvent: true },
  { name: "titre", description: "L'intitulé du rendez-vous", perEvent: true },
  { name: "lieu", description: "L'adresse, telle qu'écrite dans l'agenda", perEvent: true },
  { name: "carte", description: "Le lien Google Maps de l'adresse", perEvent: true },
  { name: "telephone", description: "Le numéro trouvé dans la description", perEvent: true },
  { name: "description", description: "La note de l'événement, abrégée", perEvent: true },
  { name: "agenda", description: "Le nom de l'agenda d'origine", perEvent: true },
];
