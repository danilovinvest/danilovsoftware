import type { DueFilter, TaskPriority, TaskSize, TaskStatus } from "./types";

/** Tonalité d'une pastille, résolue en classes par <EnumBadge>. */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

type Entry<T extends string> = Record<T, { label: string; tone: Tone }>;

export const TASK_STATUS: Entry<TaskStatus> = {
  a_faire: { label: "À faire", tone: "neutral" },
  en_cours: { label: "En cours", tone: "info" },
  en_attente: { label: "En attente", tone: "warning" },
  terminee: { label: "Terminée", tone: "success" },
};

/**
 * L'urgence d'une tâche.
 *
 * « Normale » reste neutre : une tâche ordinaire n'est pas un problème, et la
 * peindre laisserait le tableau sans place pour signaler celles qui en sont un.
 * C'est la règle des statuts de facture, appliquée ici.
 */
export const TASK_PRIORITY: Entry<TaskPriority> = {
  haute: { label: "Haute", tone: "danger" },
  normale: { label: "Normale", tone: "neutral" },
  basse: { label: "Basse", tone: "neutral" },
};

/**
 * La taille d'une tâche, comme sur un tableau GitHub Projects.
 *
 * Les quatre crans et leurs libellés anglais viennent de là : le dirigeant les
 * lit déjà sur son propre tableau, et « Très grande » ne lui dirait pas la même
 * chose. L'icône accompagne le mot pour que la carte se lise d'un coup d'œil,
 * comme la pastille d'urgence juste au-dessus.
 *
 * Aucune tonalité de danger : une grosse tâche n'est pas un problème, c'est un
 * volume. La couleur du tableau reste réservée à ce qui alerte — l'urgence et
 * le retard.
 */
export const TASK_SIZE: Record<TaskSize, { label: string; icon: string }> = {
  small: { label: "Small", icon: "🐁" },
  regular: { label: "Regular", icon: "🐢" },
  large: { label: "Large", icon: "🐘" },
  xlarge: { label: "X-Large", icon: "🐳" },
};

/** L'ordre de la liste déroulante : du plus petit au plus gros. */
export const SIZE_ORDER: TaskSize[] = ["small", "regular", "large", "xlarge"];

/**
 * Ce qu'une colonne annonce, sous son titre.
 *
 * C'est le trait qui manquait au tableau et que GitHub Projects fait bien : une
 * phrase sous l'en-tête dit **quand** une carte a sa place ici. Sans elle,
 * « En attente » et « À faire » se ressemblent assez pour qu'on hésite à chaque
 * dépôt, et deux personnes ne rangent pas pareil.
 *
 * L'émoji est celui du titre, pas une décoration : il rend la colonne
 * reconnaissable avant d'être lue, y compris quand la largeur tronque le mot.
 */
export const COLUMN_META: Record<TaskStatus, { emoji: string; hint: string }> = {
  a_faire: { emoji: "📋", hint: "Tâche pas encore commencée" },
  en_cours: { emoji: "🏗️", hint: "Tâche sur laquelle on travaille" },
  en_attente: { emoji: "⏸️", hint: "Bloquée : on attend un tiers ou un document" },
  terminee: { emoji: "✅", hint: "Faite, et datée" },
};

/**
 * Habillage des colonnes du tableau. La couleur porte l'avancement : neutre
 * tant que rien n'a commencé, bleu pendant, vert une fois clos.
 */
export const COLUMN_STYLE: Record<
  TaskStatus,
  { accent: string; dot: string; ring: string }
> = {
  a_faire: {
    accent: "bg-neutral",
    dot: "bg-neutral",
    ring: "data-[over=true]:border-neutral/50 data-[over=true]:bg-neutral-soft/60",
  },
  en_cours: {
    accent: "bg-info",
    dot: "bg-info",
    ring: "data-[over=true]:border-info/50 data-[over=true]:bg-info-soft/60",
  },
  en_attente: {
    accent: "bg-warning",
    dot: "bg-warning",
    ring: "data-[over=true]:border-warning/50 data-[over=true]:bg-warning-soft/60",
  },
  terminee: {
    accent: "bg-success",
    dot: "bg-success",
    ring: "data-[over=true]:border-success/50 data-[over=true]:bg-success-soft/60",
  },
};

/** Bordure gauche de carte : l'urgence se voit sans lire la date. */
export const DUE_ACCENT: Record<string, string> = {
  overdue: "border-l-danger",
  today: "border-l-warning",
  soon: "border-l-info",
  later: "border-l-transparent",
  none: "border-l-transparent",
};

export const DUE_TEXT: Record<string, string> = {
  overdue: "text-danger font-medium",
  today: "text-warning font-medium",
  soon: "text-foreground",
  later: "text-muted-foreground",
  none: "text-muted-foreground/60",
};

/** Ordre des colonnes du tableau de bord, du plus ouvert au plus clos. */
/*
  L'ordre des colonnes suit l'avancement, et « en attente » se place **après**
  « en cours » : on n'attend pas avant d'avoir commencé, on attend parce qu'on a
  commencé et qu'il manque quelque chose.
*/
export const STATUS_ORDER: TaskStatus[] = ["a_faire", "en_cours", "en_attente", "terminee"];

export const DUE_FILTERS: Array<{ value: DueFilter; label: string }> = [
  { value: "overdue", label: "En retard" },
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "none", label: "Sans échéance" },
];

export function toOptions<T extends string>(entries: Entry<T>) {
  return (Object.entries(entries) as Array<[T, { label: string }]>).map(
    ([value, { label }]) => ({ value, label }),
  );
}
