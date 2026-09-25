"use client";

import { cn } from "@/lib/utils";
import { dayKey, isWeekend, STATUS_LABEL, STATUS_MARK, weekdayLetter } from "../lib/labels";
import type { WorkerMonth, WorkerStatus } from "../lib/types";
import { CASE_CLASSES } from "./case-classes";

/**
 * La grille du mois, pour un écran large.
 *
 * Elle ne s'affiche qu'à partir de `md` : trente et une colonnes sur un
 * téléphone se parcourent plus lentement que le carnet qu'elles remplacent, et
 * la liste du jour répond mieux à la même question sur petit écran.
 *
 * **Une case se clique et tourne** — présent, absent, chômé, formation, vide —
 * plutôt que d'ouvrir un menu : trente et une colonnes sur dix lignes font
 * trois cent dix cases, et un menu par case rendrait la reprise d'un mois
 * insupportable. L'ordre du cycle suit la fréquence mesurée dans le classeur,
 * les deux valeurs courantes d'abord.
 *
 * La grille défile dans **son propre cadre** : ce qui est trop large ne doit
 * jamais emporter la page.
 */
export function MonthGrid({
  grille,
  canWrite,
  enCours,
  onPoser,
}: {
  grille: WorkerMonth;
  canWrite: boolean;
  enCours: string | null;
  onPoser: (workerId: string, day: string, statut: WorkerStatus | "") => void;
}) {
  const jours = Array.from({ length: grille.days }, (_, i) => i + 1);
  const cases = new Map(grille.attendance.map((d) => [`${d.worker_id}|${d.day}`, d.status]));
  const totaux = new Map(grille.totals.map((t) => [t.worker_id, t]));

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-card overflow-x-auto rounded-xl border" data-demo="ouvriers-grille">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="bg-card sticky left-0 z-10 border-r border-b px-3 py-2 text-left font-medium">
                Ouvrier
              </th>
              {jours.map((j) => (
                <th
                  key={j}
                  className={cn(
                    "border-b px-0 py-1 text-center text-[11px] font-medium tabular-nums",
                    isWeekend(grille.month, j) && "bg-muted/60",
                  )}
                >
                  <div className="text-muted-foreground">{weekdayLetter(grille.month, j)}</div>
                  <div>{j}</div>
                </th>
              ))}
              <th className="text-success border-b border-l px-2 py-2 text-center text-[11px] font-medium">
                Prés.
              </th>
              <th className="text-danger border-b px-2 py-2 text-center text-[11px] font-medium">
                Abs.
              </th>
            </tr>
          </thead>
          <tbody>
            {grille.workers.map((w) => {
              const t = totaux.get(w.id);
              return (
                <tr
                  key={w.id}
                  className={cn("border-b last:border-0", w.archived_at && "opacity-55")}
                >
                  <th
                    scope="row"
                    className="bg-card sticky left-0 z-10 border-r px-3 py-1.5 text-left font-normal whitespace-nowrap"
                  >
                    <span className="font-medium">{w.full_name}</span>
                    {w.archived_at && (
                      <span className="text-muted-foreground ml-1.5 text-[11px]">(parti)</span>
                    )}
                  </th>
                  {jours.map((j) => {
                    const day = dayKey(grille.month, j);
                    const statut = cases.get(`${w.id}|${day}`);
                    return (
                      <td
                        key={j}
                        className={cn(
                          "border-l p-0 text-center",
                          isWeekend(grille.month, j) && "bg-muted/40",
                        )}
                      >
                        <button
                          type="button"
                          disabled={!canWrite || enCours === `${w.id}|${day}`}
                          onClick={() => onPoser(w.id, day, SUITE[statut ?? "vide"])}
                          aria-label={`${w.full_name}, ${j} : ${
                            statut ? STATUS_LABEL[statut] : "non saisi"
                          }`}
                          className={cn(
                            "size-7 border border-transparent text-[11px] font-semibold transition-colors",
                            canWrite && "hover:bg-accent cursor-pointer",
                            statut && CASE_CLASSES[statut],
                          )}
                        >
                          {statut ? STATUS_MARK[statut] : ""}
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-l px-2 text-center font-semibold tabular-nums">
                    {t?.presents ?? 0}
                  </td>
                  <td
                    className={cn(
                      "px-2 text-center tabular-nums",
                      (t?.absents ?? 0) > 0 && "text-danger font-semibold",
                    )}
                  >
                    {t?.absents ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>Cliquer une case la fait tourner :</span>
        {(Object.keys(STATUS_LABEL) as WorkerStatus[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span
              className={cn(
                "inline-grid size-4 place-items-center rounded-sm text-[10px] font-semibold",
                CASE_CLASSES[k],
              )}
            >
              {STATUS_MARK[k]}
            </span>
            {STATUS_LABEL[k]}
          </span>
        ))}
        <span>puis vide.</span>
      </p>
    </div>
  );
}

/**
 * Le cycle d'une case.
 *
 * L'ordre suit la fréquence mesurée sur les trois mois du classeur : présent
 * 190 fois, chômé 260, absent 21, formation 14. Les deux valeurs qu'on pose en
 * corrigeant viennent d'abord ; « vide » ferme la boucle pour qu'une case
 * cochée par erreur se reprenne sans détour.
 */
const SUITE: Record<WorkerStatus | "vide", WorkerStatus | ""> = {
  vide: "present",
  present: "absent",
  absent: "chome",
  chome: "formation",
  formation: "",
};
