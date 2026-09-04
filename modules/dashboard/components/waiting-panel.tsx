"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangleIcon } from "lucide-react";
import { Panel, RowShell, TONE_TEXT } from "@/shared/ui/panel";
import { eurosShort, plural, sinceDays } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import type { Tone } from "@/modules/customers";
import type { WaitingRow } from "../lib/types";

/**
 * Une des quatre attentes d'après-signature.
 *
 * Le tableau de bord savait dire ce qui attend une signature. Il ne disait rien
 * de ce qui attend un acompte, une date ou une commande — c'est-à-dire de tout
 * ce qui se passe une fois l'affaire gagnée, là où l'argent dort réellement.
 *
 * Le panneau ne montre que les cinq premières lignes et annonce le reste. Une
 * liste de trente lignes sur un tableau de bord ne se lit pas : elle se fait
 * scroller, puis ignorer.
 */
export function WaitingPanel({
  title,
  hint,
  icon,
  tone,
  rows,
  className,
}: {
  title: string;
  hint: string;
  icon: LucideIcon;
  tone: Tone;
  rows: WaitingRow[];
  className?: string;
}) {
  const alerts = rows.filter((row) => row.alert).length;
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Panel
      title={title}
      description={
        rows.length === 0
          ? hint
          : `${plural(rows.length, "affaire")} · ${eurosShort(total)}${
              alerts > 0 ? ` · ${alerts} en retard` : ""
            }`
      }
      icon={icon}
      tone={alerts > 0 ? tone : "neutral"}
      className={className}
      bodyClassName="flex flex-col"
    >
      {rows.length === 0 ? (
        <p className="text-muted-foreground/60 px-3 py-6 text-center text-xs">Rien en attente.</p>
      ) : (
        <>
          {rows.slice(0, 5).map((row) => (
            <RowShell key={row.key}>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {row.alert && (
                  <AlertTriangleIcon className={cn("size-3.5 shrink-0", TONE_TEXT[tone])} />
                )}
                <div className="min-w-0">
                  <Link
                    href={`/customers?search=${encodeURIComponent(row.customer)}`}
                    className="block truncate text-sm hover:underline"
                  >
                    {row.customer}
                  </Link>
                  <p className="text-muted-foreground truncate text-xs">{row.label}</p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-sm font-medium tabular-nums">{eurosShort(row.amount)}</div>
                <div
                  className={cn(
                    "text-xs tabular-nums",
                    row.alert ? TONE_TEXT[tone] : "text-muted-foreground",
                  )}
                >
                  {sinceDays(row.days)}
                </div>
              </div>
            </RowShell>
          ))}

          {rows.length > 5 && (
            <p className="text-muted-foreground/60 px-3 py-2 text-xs">
              et {rows.length - 5} autre{rows.length - 5 > 1 ? "s" : ""}
            </p>
          )}
        </>
      )}
    </Panel>
  );
}
