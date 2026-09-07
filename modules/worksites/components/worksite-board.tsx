"use client";

import { TONE_SOFT } from "@/shared/ui/panel";
import { cn } from "@/lib/utils";
import { STATUS_ORDER } from "../lib/derive";
import { WORKSITE_STATUS } from "../lib/labels";
import { WorksiteCard } from "./worksite-card";
import type { ReadWorksite, StatusBucket } from "../lib/types";

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
  onSelect,
}: {
  reads: ReadWorksite[];
  board: StatusBucket[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {STATUS_ORDER.map((status) => {
        const entry = WORKSITE_STATUS[status];
        const bucket = board.find((b) => b.status === status);
        const cards = reads.filter((r) => r.status === status);

        return (
          <div key={status} className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                  TONE_SOFT[entry.tone],
                )}
              >
                {entry.label}
              </span>
              <span className="text-muted-foreground/60 text-[11px] tabular-nums">
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
                  <WorksiteCard key={read.worksite.id} read={read} onSelect={onSelect} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
