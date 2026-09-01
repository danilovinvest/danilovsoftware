import type { DueFilter, TaskStatus } from "./types";

/** Tonalité d'une pastille, résolue en classes par <EnumBadge>. */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

type Entry<T extends string> = Record<T, { label: string; tone: Tone }>;

export const TASK_STATUS: Entry<TaskStatus> = {
  a_faire: { label: "À faire", tone: "neutral" },
  en_cours: { label: "En cours", tone: "info" },
  terminee: { label: "Terminée", tone: "success" },
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
export const STATUS_ORDER: TaskStatus[] = ["a_faire", "en_cours", "terminee"];

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
