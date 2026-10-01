"use client";

import { TONE_SOFT } from "@/shared/ui/panel";
import { StatusPill } from "./status-pill";
import { cn } from "@/lib/utils";
import { STATUS_ORDER, STUDY_COLUMNS } from "../lib/derive";
import { STUDY_COLUMN, WORKSITE_STATUS } from "../lib/labels";
import { WorksiteCard } from "./worksite-card";
import type {
  Metier,
  ReadWorksite,
  StatusBucket,
  StudyColumn,
  WorksiteStatus,
} from "../lib/types";

/**
 * Le tableau, quatre colonnes.
 *
 * **Il n'est pas déplaçable, et c'est délibéré.** Le statut se déduit de
 * l'étape et de la date de démarrage ; autoriser le glisser-déposer créerait
 * une seconde vérité, qui divergerait des dates dès la première carte oubliée.
 * On renseigne une date, la carte change de colonne.
 */
export function WorksiteBoard({
  reads,
  board,
  metier,
  onSelect,
}: {
  reads: ReadWorksite[];
  board: StatusBucket[];
  metier: Metier;
  onSelect: (id: string) => void;
}) {
  // Les deux métiers n'ont pas les mêmes colonnes : un bureau d'études ne
  // planifie pas, il produit puis rend.
  const etudes = metier === "etudes";
  const ordre: Array<WorksiteStatus | StudyColumn> = etudes
    ? STUDY_COLUMNS
    : STATUS_ORDER;

  return (
    // Sept colonnes pour les études : elles défilent dans leur cadre, jamais
    // en emportant la page.
    <div
      data-demo={etudes ? "etudes-crans" : undefined}
      className={cn(
        "gap-3",
        etudes
          ? "grid auto-cols-[minmax(13rem,1fr)] grid-flow-col overflow-x-auto pb-1"
          : "grid sm:grid-cols-2 xl:grid-cols-4",
      )}
    >
      {ordre.map((status) => {
        const entry = etudes
          ? STUDY_COLUMN[status as StudyColumn]
          : WORKSITE_STATUS[status as WorksiteStatus];
        const bucket = board.find((b) => b.status === status);
        const cards = reads.filter((r) =>
          etudes ? r.column === status : r.status === status,
        );

        return (
          <div key={status} className="flex min-w-0 flex-col gap-2">
            {/* L'en-tête prend la couleur de sa colonne : quatre colonnes grises
                se ressemblaient, et il fallait lire chaque titre pour savoir où
                l'on était. Le nombre est en gras, c'est ce qu'on compare. */}
            <div
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5",
                TONE_SOFT[entry.tone],
              )}
            >
              <StatusPill tone={entry.tone} label={entry.label} className="bg-background/70" />
              <span className="text-sm font-bold tabular-nums">
                {bucket?.count ?? 0}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {cards.length === 0 ? (
                <p className="text-muted-foreground/50 rounded-lg border border-dashed px-2 py-4 text-center text-[11px]">
                  Aucun
                </p>
              ) : (
                cards.map((read) => (
                  <WorksiteCard
                    key={read.worksite.id}
                    read={read}
                    metier={metier}
                    onSelect={onSelect}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
