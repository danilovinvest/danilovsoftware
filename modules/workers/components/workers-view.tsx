"use client";

import { useCallback, useState } from "react";
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
import { currentMonth, monthLabel, shiftMonth } from "../lib/labels";
import type { WorkerStatus } from "../lib/types";
import { DayList } from "./day-list";
import { MonthGrid } from "./month-grid";
import { PortalCard } from "./portal-card";

/**
 * Les ouvriers : le pointage du mois, l'équipe, le secret de l'écran de dépôt.
 *
 * **Deux présentations pour la même donnée, et la petite d'abord.** Sous `md`,
 * on choisit un jour et on parcourt l'équipe ; au-delà, la grille du mois. Ce
 * n'est pas un repli : une grille de trente et une colonnes sur 390 pixels se
 * parcourt plus lentement que le carnet qu'elle remplace, et la question qu'on
 * se pose au téléphone est « qui est là aujourd'hui », pas « comment s'est
 * passé le mois ». Les deux sont rendues et CSS choisit — pas de requête de
 * média lue en JavaScript, donc pas d'écart d'hydratation.
 *
 * **Les totaux sont ce que le classeur promettait sans jamais le calculer.**
 * Ses trois colonnes de droite — jours travaillés, salaire, fiche de paie —
 * étaient vides sur les trente lignes ouvrier-mois : le comptage se faisait à
 * la main, hors du fichier. Il est ici, compté par le serveur en SQL.
 */
export function WorkersView() {
  const { can } = useAuth();
  const canWrite = can("workers:write");
  const [month, setMonth] = useState(() => currentMonth());
  const [jour, setJour] = useState(() => new Date().getDate());
  const [nouveau, setNouveau] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);

  const {
    data: grille,
    error,
    mutate,
  } = useCached(`workers:month:${month}`, () => api.getMonth(month), LIVE);

  const poser = useCallback(
    async (workerId: string, day: string, statut: WorkerStatus | "") => {
      if (!canWrite) return;
      setEnCours(`${workerId}|${day}`);
      try {
        await api.markAttendance(workerId, day, statut);
        await mutate();
      } catch (cause) {
        notifyError(
          cause instanceof Error ? cause.message : "Le pointage n'a pas été enregistré.",
        );
      } finally {
        setEnCours(null);
      }
    },
    [canWrite, mutate],
  );

  function changerMois(delta: number) {
    setMonth((m) => {
      const suivant = shiftMonth(m, delta);
      // Le 31 n'existe pas partout : on ramène le jour choisi dans le mois.
      setJour((j) => Math.min(j, new Date(Number(suivant.slice(0, 4)), Number(suivant.slice(5, 7)), 0).getDate()));
      return suivant;
    });
  }

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

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Mois précédent" onClick={() => changerMois(-1)}>
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="min-w-36 text-center text-sm font-semibold capitalize sm:min-w-44">
          {monthLabel(grille.month)}
        </span>
        <Button variant="outline" size="icon" aria-label="Mois suivant" onClick={() => changerMois(1)}>
          <ChevronRightIcon className="size-4" />
        </Button>
        {grille.month !== currentMonth() && (
          <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonth())}>
            <UndoIcon className="size-3.5" /> Mois courant
          </Button>
        )}
      </div>

      {/* Le téléphone d'abord : un jour à la fois. */}
      <div className="md:hidden">
        <DayList
          grille={grille}
          jour={Math.min(jour, grille.days)}
          onJour={setJour}
          canWrite={canWrite}
          enCours={enCours}
          onPoser={poser}
        />
      </div>
      {/* Le mois entier, dès qu'il y a la place de le lire. */}
      <div className="hidden md:block">
        <MonthGrid grille={grille} canWrite={canWrite} enCours={enCours} onPoser={poser} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-card rounded-xl border p-4" data-demo="ouvriers-equipe">
          <h2 className="mb-3 text-sm font-semibold">L&apos;équipe</h2>
          {canWrite && (
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <Input
                value={nouveau}
                onChange={(e) => setNouveau(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void ajouter();
                }}
                placeholder="Nom de l'ouvrier"
                aria-label="Nom de l'ouvrier à ajouter"
              />
              <Button onClick={() => void ajouter()} disabled={!nouveau.trim()}>
                <PlusIcon className="size-4" /> Ajouter
              </Button>
            </div>
          )}
          {grille.workers.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucun ouvrier. En ajouter un pour commencer à pointer.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {grille.workers.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className={cn("truncate", w.archived_at && "text-muted-foreground line-through")}>
                    {w.full_name}
                  </span>
                  {canWrite &&
                    (w.archived_at ? (
                      <Button variant="ghost" size="sm" onClick={() => void reintegrer(w.id, w.full_name)}>
                        Réintégrer
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void retirer(w.id, w.full_name, w.attendance_days)}
                      >
                        {w.attendance_days === 0 ? "Supprimer" : "Retirer"}
                      </Button>
                    ))}
                </li>
              ))}
            </ul>
          )}
        </div>

        <PortalCard />
      </div>
    </div>
  );
}
