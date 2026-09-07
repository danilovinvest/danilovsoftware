"use client";

import { ExternalLinkIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TONE_SOFT } from "@/shared/ui/panel";
import { euros, formatDate } from "@/shared/lib/format";
import { WORKSITE_STATUS } from "../lib/labels";
import type { ReadWorksite } from "../lib/types";

/**
 * La vue liste : tout voir d'un coup, triable à l'œil.
 *
 * La colonne « pièces » n'affiche pas un nombre mais les références elles-mêmes
 * — `DE2026-0048`, `FA2026-0106`. C'est ce qu'on cherche quand on ouvre cet
 * écran, et c'est le seul identifiant que l'entreprise partage avec ses
 * dossiers OneDrive.
 */
export function WorksiteList({
  reads,
  onSelect,
}: {
  reads: ReadWorksite[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <Table className="min-w-200 [&_thead_th]:text-muted-foreground [&_thead_th]:h-8 [&_thead_th]:text-xs [&_thead_th]:font-medium">
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Chantier</TableHead>
            <TableHead>Lieu</TableHead>
            <TableHead>Démarrage</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Devis HT</TableHead>
            <TableHead>Pièces</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reads.map((read) => {
            const { worksite: w } = read;
            const entry = WORKSITE_STATUS[read.status];
            return (
              <TableRow
                key={w.id}
                className="cursor-pointer"
                onClick={() => onSelect(w.id)}
              >
                <TableCell className="font-medium">{w.customer_name}</TableCell>
                <TableCell className="text-muted-foreground max-w-70 truncate text-sm">
                  {w.label}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {w.city || "—"}
                </TableCell>
                <TableCell className="text-sm tabular-nums">
                  {w.started_at ? (
                    formatDate(w.started_at)
                  ) : (
                    <span className="text-warning">à planifier</span>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                      TONE_SOFT[entry.tone],
                    )}
                  >
                    {entry.label}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {read.amountHT === null ? (
                    <span className="text-muted-foreground/40">non chiffré</span>
                  ) : (
                    euros(read.amountHT)
                  )}
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1">
                    {w.quotes.length === 0 && (
                      <span className="text-muted-foreground/50 text-xs">aucune</span>
                    )}
                    {w.quotes.map((quote) => (
                      <a
                        key={quote.id}
                        href={quote.drive_url || undefined}
                        target="_blank"
                        rel="noreferrer"
                        title={quote.drive_name || quote.label}
                        onClick={(event) => event.stopPropagation()}
                        className={cn(
                          "hover:bg-accent flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] transition-colors",
                          quote.reference.toUpperCase().startsWith("FA")
                            ? "text-success border-success/40"
                            : "text-muted-foreground",
                        )}
                      >
                        {quote.reference || "sans référence"}
                        {quote.drive_url && <ExternalLinkIcon className="size-2.5" />}
                      </a>
                    ))}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
