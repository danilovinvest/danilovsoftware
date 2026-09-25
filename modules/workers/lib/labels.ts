import type { WorkerStatus } from "./types";

/** Le mot complet, pour une légende ou une infobulle. */
export const STATUS_LABEL: Record<WorkerStatus, string> = {
  present: "Présent",
  absent: "Absent",
  formation: "Formation",
  chome: "Chômé",
};

/**
 * La lettre de la grille, celle du classeur d'origine.
 *
 * `p`, `a`, `form` et `/` sont ce que l'équipe écrivait déjà à la main pendant
 * trois mois. Les remplacer par des symboles inventés obligerait à réapprendre
 * une grille qu'on sait déjà lire.
 */
export const STATUS_MARK: Record<WorkerStatus, string> = {
  present: "p",
  absent: "a",
  formation: "f",
  chome: "/",
};

/**
 * La tonalité d'une case, dans le vocabulaire de couleurs du CRM.
 *
 * Chômé est neutre et non « mauvais » : un dimanche n'est pas une absence, et
 * les colorer pareil ferait lire la fermeture d'août comme un mois de défaut.
 */
export const STATUS_TONE: Record<WorkerStatus, "success" | "danger" | "info" | "neutral"> = {
  present: "success",
  absent: "danger",
  formation: "info",
  chome: "neutral",
};

/** « septembre 2026 » à partir de « 2026-09 ». */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

/** Le mois précédent ou suivant, en AAAA-MM. */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Le mois courant, en AAAA-MM. */
export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * La lettre du jour de la semaine, pour coiffer chaque colonne.
 *
 * Elle n'est pas décorative : sans elle, on ne voit pas que la colonne vide
 * qu'on regarde est un dimanche, et on croit à un oubli de pointage.
 */
export function weekdayLetter(month: string, day: number): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, day)
    .toLocaleDateString("fr-FR", { weekday: "narrow" })
    .toUpperCase();
}

/** Vrai le samedi et le dimanche, pour teinter la colonne. */
export function isWeekend(month: string, day: number): boolean {
  const [year, m] = month.split("-").map(Number);
  const wd = new Date(year, m - 1, day).getDay();
  return wd === 0 || wd === 6;
}

/** La clé d'une case : AAAA-MM-JJ. */
export function dayKey(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, "0")}`;
}
