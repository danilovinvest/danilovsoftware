"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { dayKey, isWeekend, STATUS_LABEL, STATUS_MARK, weekdayLetter } from "../lib/labels";
import type { WorkerStatus, WorkerMonth } from "../lib/types";
import { CASE_CLASSES } from "./case-classes";

/**
 * Le pointage d'**un** jour, pour le téléphone.
 *
 * Une grille de trente et une colonnes ne se lit pas sur 390 pixels : la faire
 * défiler horizontalement pour trouver le 17 est plus long que de prendre le
 * carnet. Sur petit écran on renverse donc la question — on choisit d'abord le
 * jour, puis on parcourt l'équipe — et c'est la même donnée, présentée dans
 * l'ordre où on l'a en tête quand on rattrape une journée.
 *
 * Les quatre valeurs sont posées directement, sans cycle : au doigt, appuyer
 * trois fois pour atteindre « chômé » est une source d'erreur, là où la souris
 * pardonne. C'est l'écart assumé avec la grille du grand écran.
 */
export function DayList({
  grille,
  jour,
  onJour,
  canWrite,
  enCours,
  onPoser,
}: {
  grille: WorkerMonth;
  jour: number;
  onJour: (jour: number) => void;
  canWrite: boolean;
  enCours: string | null;
  onPoser: (workerId: string, day: string, statut: WorkerStatus | "") => void;
}) {
  const cle = dayKey(grille.month, jour);
  const cases = new Map(grille.attendance.map((d) => [`${d.worker_id}|${d.day}`, d.status]));
  const weekend = isWeekend(grille.month, jour);

  return (
    <div className="flex flex-col gap-4" data-demo="ouvriers-jour">
      <div className="bg-card flex items-center justify-between gap-2 rounded-xl border px-2 py-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Jour précédent"
          disabled={jour <= 1}
          onClick={() => onJour(jour - 1)}
        >
          <ChevronLeftIcon className="size-5" />
        </Button>
        <div className="text-center">
          <div className="text-muted-foreground text-xs">
            {weekdayLetter(grille.month, jour)}
            {weekend && " · week-end"}
          </div>
          <div className="text-lg font-semibold tabular-nums">
            {jour} {new Date(`${grille.month}-01`).toLocaleDateString("fr-FR", { month: "long" })}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Jour suivant"
          disabled={jour >= grille.days}
          onClick={() => onJour(jour + 1)}
        >
          <ChevronRightIcon className="size-5" />
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        {grille.workers.map((w) => {
          const statut = cases.get(`${w.id}|${cle}`);
          return (
            <li
              key={w.id}
              className={cn(
                "bg-card flex flex-col gap-2 rounded-xl border px-3 py-2",
                w.archived_at && "opacity-55",
              )}
            >
              <span className="truncate text-sm font-medium">
                {w.full_name}
                {w.archived_at && (
                  <span className="text-muted-foreground ml-1.5 text-xs">(parti)</span>
                )}
              </span>
              <div role="group" aria-label={`Pointage de ${w.full_name}`} className="flex gap-1.5">
                {(Object.keys(STATUS_LABEL) as WorkerStatus[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={!canWrite || enCours === `${w.id}|${cle}`}
                    aria-pressed={statut === v}
                    onClick={() => onPoser(w.id, cle, statut === v ? "" : v)}
                    className={cn(
                      "h-11 flex-1 rounded-lg border text-xs font-semibold transition-colors",
                      statut === v ? CASE_CLASSES[v] : "text-muted-foreground",
                    )}
                  >
                    {STATUS_MARK[v]}
                    <span className="sr-only"> {STATUS_LABEL[v]}</span>
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-muted-foreground text-xs">
        Appuyer à nouveau sur la même valeur rend le jour à « non saisi ».
      </p>
    </div>
  );
}
