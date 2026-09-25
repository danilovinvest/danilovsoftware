import type { WorkerStatus } from "../lib/types";

/**
 * La couleur d'une case de pointage, partagée par la grille et la liste du jour.
 *
 * L'encre est `--background` et jamais du blanc : les tonalités de statut sont
 * le cran 11 de Radix, sombre sur fond clair et clair en thème sombre. Du blanc
 * en dur disparaîtrait dans l'un des deux.
 *
 * Chômé est neutre et non « mauvais » : un dimanche n'est pas une absence, et
 * les colorer pareil ferait lire la fermeture d'août comme un mois de défaut.
 */
export const CASE_CLASSES: Record<WorkerStatus, string> = {
  present: "bg-success text-background border-transparent",
  absent: "bg-danger text-background border-transparent",
  demi: "bg-warning text-background border-transparent",
  formation: "bg-info text-background border-transparent",
  chome: "bg-muted text-muted-foreground border-transparent",
};
