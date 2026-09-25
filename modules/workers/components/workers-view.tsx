"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, UndoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LIVE, useCached } from "@/shared/api/cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askConfirm } from "@/shared/ui/confirm";
import { ErrorNotice } from "@/shared/ui/feedback";
import { TableSkeleton } from "@/shared/ui/loading";
import { notifyError, notifySuccess } from "@/shared/ui/toaster";
import { useAuth } from "@/modules/auth";
import * as api from "../lib/api";
import {
  currentMonth,
  dayKey,
  isWeekend,
  monthLabel,
  shiftMonth,
  STATUS_LABEL,
  STATUS_MARK,
  weekdayLetter,
} from "../lib/labels";
import type { WorkerStatus } from "../lib/types";
import { PortalCard } from "./portal-card";

/**
 * La grille du mois, l'équipe, et le secret de l'écran de chantier.
 *
 * **Les totaux sont ce que le classeur promettait sans jamais le calculer.**
 * Ses trois colonnes de droite — jours travaillés, salaire, fiche de paie —
 * étaient vides sur les trente lignes ouvrier-mois : le comptage se faisait à
 * la main, hors du fichier. Il est ici, compté par le serveur en SQL, sur la
 * seule source qui porte les faits.
 *
 * **Une case se clique et tourne**, plutôt que d'ouvrir un menu : présent →
 * absent → chômé → formation → vide. Trente et une colonnes et dix lignes font
 * trois cent dix cases, et un menu par case rendrait la correction d'un mois
 * insupportable. L'ordre du cycle suit la fréquence mesurée dans le classeur,
 * les deux valeurs courantes d'abord.
 */
export function WorkersView() {
  const { can } = useAuth();
  const canWrite = can("workers:write");
  const [month, setMonth] = useState(() => currentMonth());
  const [nouveau, setNouveau] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);

  const {
    data: grille,
    error,
    mutate,
  } = useCached(`workers:month:${month}`, () => api.getMonth(month), LIVE);

  const cases = useMemo(() => {
    const m = new Map<string, WorkerStatus>();
    for (const d of grille?.attendance ?? []) m.set(`${d.worker_id}|${d.day}`, d.status);
    return m;
  }, [grille]);

  const totaux = useMemo(() => {
    const m = new Map<string, { presents: number; absents: number }>();
    for (const t of grille?.totals ?? []) {
      m.set(t.worker_id, { presents: t.presents, absents: t.absents });
    }
    return m;
  }, [grille]);

  const basculer = useCallback(
    async (workerId: string, day: string) => {
      if (!canWrite) return;
      const actuel = cases.get(`${workerId}|${day}`);
      const suivant = SUITE[actuel ?? "vide"];
      const cle = `${workerId}|${day}`;
      setEnCours(cle);
      try {
        await api.markAttendance(workerId, day, suivant);
        await mutate();
      } catch (cause) {
        notifyError(cause instanceof Error ? cause.message : "Le pointage n'a pas été enregistré.");
      } finally {
        setEnCours(null);
      }
    },
    [canWrite, cases, mutate],
  );

  async function ajouter() {
    const nom = nouveau.trim();
    if (!nom) return;
    try {
      await api.createWorker(nom);
      setNouveau("");
      await mutate();
      notifySuccess(`${nom} rejoint l'équipe.`);
    } catch (cause) {
      notifyError(cause instanceof Error ? cause.message : "L'ouvrier n'a pas été ajouté.");
    }
  }

  async function retirer(id: string, nom: string, jours: number) {
    // Archiver est le geste courant ; supprimer n'est offert que sur une ligne
    // qui n'a jamais servi, et le serveur le redit de son côté.
    const definitif = jours === 0;
    const ok = await askConfirm({
      title: definitif ? `Supprimer ${nom} ?` : `Retirer ${nom} de l'équipe ?`,
      description: definitif
        ? "Cette fiche n'a jamais été pointée : elle part pour de bon."
        : `${jours} jour(s) de pointage restent au dossier et ne bougent pas. ` +
          "L'ouvrier disparaît de l'écran de chantier et des mois à venir.",
      confirmLabel: definitif ? "Supprimer" : "Retirer",
    });
    if (!ok) return;
    try {
      if (definitif) await api.deleteWorker(id);
      else await api.archiveWorker(id, true);
      await mutate();
    } catch (cause) {
      notifyError(cause instanceof Error ? cause.message : "Le retrait a échoué.");
    }
  }

  async function reintegrer(id: string, nom: string) {
    try {
      await api.archiveWorker(id, false);
      await mutate();
      notifySuccess(`${nom} revient dans l'équipe.`);
    } catch (cause) {
      notifyError(cause instanceof Error ? cause.message : "La réintégration a échoué.");
    }
  }

  if (error !== undefined && grille === undefined) {
    return <ErrorNotice message="Le pointage n'a pas pu être lu." onRetry={() => void mutate()} />;
  }
  if (grille === undefined) return <TableSkeleton hue="amber" />;

  const jours = Array.from({ length: grille.days }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Mois précédent"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}>
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="min-w-44 text-center text-sm font-semibold capitalize">
          {monthLabel(grille.month)}
        </span>
        <Button variant="outline" size="icon" aria-label="Mois suivant"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}>
          <ChevronRightIcon className="size-4" />
        </Button>
        {grille.month !== currentMonth() && (
          <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonth())}>
            <UndoIcon className="size-3.5" /> Mois courant
          </Button>
        )}
      </div>

      {/* La grille défile dans son propre cadre : trente et une colonnes ne
          tiennent sur aucun téléphone, et emporter la page serait pire. */}
      <div className="bg-card overflow-x-auto rounded-xl border" data-demo="ouvriers-grille">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="bg-card sticky left-0 z-10 border-b border-r px-3 py-2 text-left font-medium">
                Ouvrier
              </th>
              {jours.map((j) => (
                <th key={j}
                  className={cn("border-b px-0 py-1 text-center text-[11px] font-medium tabular-nums",
                    isWeekend(grille.month, j) && "bg-muted/60")}>
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
              const t = totaux.get(w.id) ?? { presents: 0, absents: 0 };
              return (
                <tr key={w.id} className={cn("border-b last:border-0", w.archived_at && "opacity-55")}>
                  <th scope="row"
                    className="bg-card sticky left-0 z-10 border-r px-3 py-1.5 text-left font-normal whitespace-nowrap">
                    <span className="font-medium">{w.full_name}</span>
                    {w.archived_at && (
                      <span className="text-muted-foreground ml-1.5 text-[11px]">(parti)</span>
                    )}
                  </th>
                  {jours.map((j) => {
                    const day = dayKey(grille.month, j);
                    const statut = cases.get(`${w.id}|${day}`);
                    return (
                      <td key={j}
                        className={cn("border-l p-0 text-center",
                          isWeekend(grille.month, j) && "bg-muted/40")}>
                        <button type="button"
                          disabled={!canWrite || enCours === `${w.id}|${day}`}
                          onClick={() => void basculer(w.id, day)}
                          aria-label={`${w.full_name}, ${j} : ${statut ? STATUS_LABEL[statut] : "non saisi"}`}
                          className={cn(
                            "size-7 text-[11px] font-semibold transition-colors",
                            canWrite && "hover:bg-accent cursor-pointer",
                            statut && CASE_CLASSES[statut],
                          )}>
                          {statut ? STATUS_MARK[statut] : ""}
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-l px-2 text-center font-semibold tabular-nums">{t.presents}</td>
                  <td className={cn("px-2 text-center tabular-nums", t.absents > 0 && "text-danger font-semibold")}>
                    {t.absents}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-muted-foreground text-xs">
        Cliquer une case la fait tourner : présent → absent → chômé → formation → vide.
        <span className="ml-2">
          {Object.entries(STATUS_LABEL).map(([k, label]) => (
            <span key={k} className="mr-3 inline-flex items-center gap-1">
              <span className={cn("inline-grid size-4 place-items-center rounded-sm text-[10px] font-semibold",
                CASE_CLASSES[k as WorkerStatus])}>
                {STATUS_MARK[k as WorkerStatus]}
              </span>
              {label}
            </span>
          ))}
        </span>
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-card rounded-xl border p-4" data-demo="ouvriers-equipe">
          <h2 className="mb-3 text-sm font-semibold">L&apos;équipe</h2>
          {canWrite && (
            <div className="mb-3 flex gap-2">
              <Input value={nouveau} onChange={(e) => setNouveau(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void ajouter(); }}
                placeholder="Nom de l'ouvrier" aria-label="Nom de l'ouvrier à ajouter" />
              <Button onClick={() => void ajouter()} disabled={!nouveau.trim()}>
                <PlusIcon className="size-4" /> Ajouter
              </Button>
            </div>
          )}
          <ul className="divide-y text-sm">
            {grille.workers.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className={cn(w.archived_at && "text-muted-foreground line-through")}>
                  {w.full_name}
                </span>
                {canWrite &&
                  (w.archived_at ? (
                    <Button variant="ghost" size="sm" onClick={() => void reintegrer(w.id, w.full_name)}>
                      Réintégrer
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm"
                      onClick={() => void retirer(w.id, w.full_name, w.attendance_days)}>
                      {w.attendance_days === 0 ? "Supprimer" : "Retirer"}
                    </Button>
                  ))}
              </li>
            ))}
          </ul>
        </div>

        <PortalCard />
      </div>
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

/**
 * La couleur d'une case.
 *
 * L'encre est `--background` et jamais du blanc : les tonalités de statut sont
 * le cran 11 de Radix, sombre sur fond clair et clair en thème sombre. Du
 * blanc en dur disparaîtrait dans l'un des deux.
 */
const CASE_CLASSES: Record<WorkerStatus, string> = {
  present: "bg-success text-background",
  absent: "bg-danger text-background",
  formation: "bg-info text-background",
  chome: "bg-muted text-muted-foreground",
};
