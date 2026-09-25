/**
 * Les ouvriers et leur pointage, miroir de `internal/workers` côté API.
 */

/**
 * Ce qu'une case peut valoir.
 *
 * Quatre valeurs viennent du classeur « Calendrier ouvriers.xlsx », mesurées
 * sur ses trois mois réels : présent 190 fois, chômé 260, absent 21,
 * formation 14. La cinquième, la **demi-journée**, vient du dirigeant : elle
 * n'est ni une présence ni une absence, et la compter d'un côté ou de l'autre
 * fausse la paie dans les deux sens. Elle vaut 0,5 jour travaillé.
 */
export type WorkerStatus = "present" | "absent" | "demi" | "formation" | "chome";

export const WORKER_STATUSES: WorkerStatus[] = [
  "present",
  "absent",
  "demi",
  "formation",
  "chome",
];

/** L'état du rapport mensuel au comptable, jamais un secret. */
export type ReportState = {
  recipient: string;
  enabled: boolean;
  last_sent_month: string;
  last_sent_at: string | null;
  last_error: string;
  /** Faux si aucune boîte n'est raccordée : rien ne pourrait partir. */
  can_send: boolean;
};

export type ReportLine = {
  worker: string;
  jours_travailles: number;
  demi_journees: number;
  absences: number;
  formations: number;
  dates_absences: string[];
};

export type Report = {
  month: string;
  libelle: string;
  lignes: ReportLine[];
  /** Combien de samedis le mois comptait, et qui sont restés dehors. */
  samedis_exclus: number;
};

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
