import type { DueFilter, TaskStatus } from "./types";

/** Tonalité d'une pastille, résolue en classes par <EnumBadge>. */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

type Entry<T extends string> = Record<T, { label: string; tone: Tone }>;

export const TASK_STATUS: Entry<TaskStatus> = {
  a_faire: { label: "À faire", tone: "neutral" },
  en_cours: { label: "En cours", tone: "info" },
  terminee: { label: "Terminée", tone: "success" },
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
