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
import { projectReference } from "@/modules/customers";
import { euros, formatDate } from "@/shared/lib/format";
import { STUDY_STATUS, WORKSITE_STATUS } from "../lib/labels";
import type { Metier, ReadWorksite } from "../lib/types";
import { StatusPill } from "./status-pill";

/**
 * La vue liste : tout voir d'un coup, triable à l'œil.
 *
 * La colonne « pièces » n'affiche pas un nombre mais les références elles-mêmes
 * — `DE2026-0048`, `FA2026-0106`. C'est ce qu'on cherche quand on ouvre cet
 * écran, et c'est le seul identifiant que l'entreprise partage avec ses
 * dossiers OneDrive.
 *
 * **Ce qu'on cherche se lit en premier.** Le client et le montant sont en gras,
 * l'intitulé et le lieu restent en retrait ; l'en-tête prend la teinte du
 * module — ambre pour les chantiers, indigo pour les études — et se distingue
 * ainsi des lignes au lieu de se confondre avec elles.
 */
export function WorksiteList({
  reads,
  metier,
  onSelect,
}: {
  reads: ReadWorksite[];
  metier: Metier;
  onSelect: (id: string) => void;
}) {
  const etudes = metier === "etudes";
  const entete = etudes
    ? "[&_thead_tr]:bg-h-indigo-3 [&_thead_th]:text-h-indigo-11"
    : "[&_thead_tr]:bg-h-amber-3 [&_thead_th]:text-h-amber-11";

  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-lg border">
      <Table
        className={cn(
          "min-w-200 [&_thead_th]:h-9 [&_thead_th]:text-[11px] [&_thead_th]:font-bold [&_thead_th]:tracking-wide [&_thead_th]:uppercase [&_thead_tr]:border-b-0 [&_thead_tr]:hover:bg-transparent",
          entete,
        )}
      >
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>{etudes ? "Étude" : "Chantier"}</TableHead>
            <TableHead>Lieu</TableHead>
            <TableHead>{etudes ? "Plans" : "Démarrage"}</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Devis HT</TableHead>
            <TableHead>Pièces</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reads.map((read) => {
            const { worksite: w } = read;
            const entry = etudes ? STUDY_STATUS[read.study] : WORKSITE_STATUS[read.status];
            return (
              <TableRow
                key={w.id}
                className="cursor-pointer"
                onClick={() => onSelect(w.id)}
              >
                <TableCell className="text-foreground text-[13px] font-semibold">
                  {w.customer_name}
                  <span className="text-muted-foreground block font-mono text-[10px] font-medium">
                    {projectReference(w.reference, metier)}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-70 truncate text-sm">
                  {w.label}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {w.city || "—"}
                </TableCell>
                <TableCell className="text-sm font-medium tabular-nums">
                  {etudes ? (
                    w.plans_sent_at ? (
                      formatDate(w.plans_sent_at)
                    ) : (
                      <span className="text-muted-foreground font-normal">à rendre</span>
                    )
                  ) : w.started_at ? (
                    formatDate(w.started_at)
                  ) : (
                    <span className="text-warning font-semibold">à planifier</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusPill tone={entry.tone} label={entry.label} />
                </TableCell>
                <TableCell className="text-right text-[13px] font-semibold tabular-nums">
                  {read.amountHT === null ? (
                    <span className="text-muted-foreground/40 font-normal">non chiffré</span>
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
                          "hover:bg-accent flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold transition-colors",
                          quote.reference.toUpperCase().startsWith("FA")
                            ? "text-success border-success/40 bg-success-soft"
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
