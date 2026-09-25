/**
 * Les ouvriers et leur pointage, miroir de `internal/workers` côté API.
 */

/**
 * Ce qu'une case peut valoir.
 *
 * Quatre valeurs **mesurées** sur les trois mois réels du classeur
 * « Calendrier ouvriers.xlsx », et pas une de plus : présent 190 fois, chômé
 * 260, absent 21, formation 14. L'écran de chantier n'écrit que les deux
 * premières — une croix verte, une croix rouge — mais la grille du CRM doit
 * savoir représenter un dimanche et la fermeture du mois d'août, qui sont
 * les 260.
 */
export type WorkerStatus = "present" | "absent" | "formation" | "chome";

export const WORKER_STATUSES: WorkerStatus[] = ["present", "absent", "formation", "chome"];

export type Worker = {
  id: string;
  full_name: string;
  /** L'ordre d'affichage : celui de l'équipe, pas l'alphabet. */
  position: number;
  /** Nul tant que la personne est dans l'équipe. */
  archived_at: string | null;
  /**
   * Combien de jours cet ouvrier a déjà été pointé. C'est ce qui décide si
   * l'écran propose l'archivage ou la suppression franche : une ligne créée
   * par erreur, jamais pointée, n'a pas à encombrer la liste des archivés.
   */
  attendance_days: number;
};

export type AttendanceDay = {
  worker_id: string;
  /** AAAA-MM-JJ. */
  day: string;
  status: WorkerStatus;
  recorded_at: string;
  /** Nul quand le pointage vient de l'écran de chantier, qui n'a pas de compte. */
  recorded_by: string | null;
};

export type WorkerTotals = {
  worker_id: string;
  presents: number;
  absents: number;
  formations: number;
  chomes: number;
};

export type WorkerMonth = {
  /** AAAA-MM, tel que le serveur l'a compris. */
  month: string;
  /** Le nombre de jours du mois — l'écran n'a pas à se tromper sur février. */
  days: number;
  workers: Worker[];
  attendance: AttendanceDay[];
  totals: WorkerTotals[];
};

/** L'état du secret de l'écran de chantier, jamais le secret lui-même. */
export type PortalState = {
  configured: boolean;
  updated_at: string | null;
  updated_by: string | null;
};
