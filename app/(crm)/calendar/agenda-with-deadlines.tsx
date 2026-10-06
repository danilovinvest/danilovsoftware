"use client";

import { CalendarView } from "@/modules/calendar";
import { DossierDeadlines } from "@/modules/worksites";

/**
 * L'agenda et, au-dessus de sa grille, les délais des dossiers de la période.
 * L'assemblage se fait ici parce que l'agenda ne peut pas importer les
 * chantiers sans boucle de modules.
 */
export function AgendaWithDeadlines() {
  return <CalendarView banner={(range) => <DossierDeadlines from={range.from} to={range.to} />} />;
}
