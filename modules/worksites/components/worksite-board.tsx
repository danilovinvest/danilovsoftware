"use client";

import { cn } from "@/lib/utils";
import { eurosShort } from "@/shared/lib/format";
import { TONE_FILL } from "@/shared/ui/panel";
import { STATUS_ORDER, WORKSITE_STATUS } from "../lib/labels";
import type { StatusBucket, Worksite } from "../lib/types";
import { WorksiteCard } from "./worksite-card";

/**
 * Le tableau, dans l'ordre du chantier.
 *
 * **Il ne se déplace pas à la main**, et c'est délibéré : le statut est déduit
 * des dates et des jalons — signé, démarré, terminé, PV signé, solde encaissé.
 * Autoriser le glisser-déposer créerait une seconde vérité, qui divergerait des
 * dates dès la première carte oubliée. On renseigne une date, la carte change
 * de colonne.
 */
export function WorksiteBoard({
  worksites,
  board,
  onSelect,
}: {
  worksites: Worksite[];
  board: StatusBucket[];
  onSelect: (worksite: Worksite) => void;
}) {
  const byStatus = new Map(board.map((bucket) => [bucket.status, bucket]));

  return (
    <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {STATUS_ORDER.map((status) => {
        const entry = WORKSITE_STATUS[status];
        const bucket = byStatus.get(status);
        const cards = worksites.filter((worksite) => worksite.status === status);

        return (
          <section key={status} className="flex min-w-0 flex-col gap-2">
            <header className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", TONE_FILL[entry.tone])} />
                <span className="truncate text-xs font-medium">{entry.label}</span>
                <span className="text-muted-foreground ml-auto text-[11px] tabular-nums">
                  {bucket?.count ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={cn("h-0.5 flex-1 rounded-full", TONE_FILL[entry.tone])} />
              </div>
              <p className="text-muted-foreground/70 text-[11px] tabular-nums">
                {eurosShort(bucket?.amount ?? 0)}
              </p>
            </header>

            <div className="flex flex-col gap-2">
              {cards.length === 0 ? (
                <p className="text-muted-foreground/50 rounded-lg border border-dashed px-2.5 py-4 text-center text-[11px]">
                  Aucun
                </p>
              ) : (
                cards.map((worksite) => (
                  <WorksiteCard
                    key={worksite.id}
                    worksite={worksite}
                    onSelect={onSelect}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
