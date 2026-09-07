"use client";

import { CalendarPlusIcon, FileTextIcon, MapPinIcon, ReceiptTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/shared/lib/format";
import { STATUS_RAIL } from "../lib/labels";
import type { ReadWorksite } from "../lib/types";

/**
 * Une carte de chantier.
 *
 * Elle porte ce que les données portent : le client, l'intitulé, le lieu, la
 * date de démarrage, les devis et les factures. Les pastilles PV / solde /
 * avis ont disparu avec le jeu de démonstration — trois jalons qu'aucune
 * donnée ne renseigne, donc trois pastilles éteintes en permanence.
 */
export function WorksiteCard({
  read,
  onSelect,
}: {
  read: ReadWorksite;
  onSelect: (id: string) => void;
}) {
  const { worksite: w } = read;

  return (
    <button
      type="button"
      onClick={() => onSelect(w.id)}
      className={cn(
        "bg-card hover:bg-accent/40 flex w-full flex-col gap-1.5 rounded-lg border border-l-2 px-2.5 py-2 text-left transition-colors",
        STATUS_RAIL[read.status],
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium">{w.customer_name}</span>
        <span className="text-muted-foreground block truncate text-[11px]">
          {w.label}
        </span>
      </span>

      {w.city && (
        <span className="text-muted-foreground/70 flex items-center gap-1 text-[11px]">
          <MapPinIcon className="size-3 shrink-0" />
          <span className="truncate">{w.city}</span>
        </span>
      )}

      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
        {w.started_at ? (
          <span className="text-muted-foreground/70 flex items-center gap-1">
            <CalendarPlusIcon className="size-3 shrink-0" />
            {formatDate(w.started_at)}
            {read.daysRunning !== null && read.status === "en_cours" && (
              <span className="text-muted-foreground/50">
                · {read.daysRunning} j
              </span>
            )}
          </span>
        ) : (
          <span className="text-warning flex items-center gap-1">
            <CalendarPlusIcon className="size-3 shrink-0" />
            sans date
          </span>
        )}

        {read.devis.length > 0 && (
          <span className="text-muted-foreground/70 flex items-center gap-1">
            <FileTextIcon className="size-3 shrink-0" />
            {read.devis.length}
          </span>
        )}
        {/* La facture est le seul jalon d'après-signature que les données
            portent réellement : elle mérite sa propre pastille. */}
        {read.factures.length > 0 && (
          <span className="text-success flex items-center gap-1">
            <ReceiptTextIcon className="size-3 shrink-0" />
            {read.factures.length}
          </span>
        )}
      </span>
    </button>
  );
}
