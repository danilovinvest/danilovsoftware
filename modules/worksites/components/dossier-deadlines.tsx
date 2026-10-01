"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, FlagIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LIVE, useCached } from "@/shared/api/cache";
import { formatDate, todayLocal } from "@/shared/lib/format";
import { projectReference } from "@/modules/customers";
import { scopeParam, useScope } from "@/modules/group";
import { listWorksites } from "../lib/api";
import { deadlinesBetween } from "../lib/deadlines";

/** Le jour local d'une date, `AAAA-MM-JJ` — jamais `toISOString`, qui parle UTC. */
function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Les délais des dossiers sur la période de l'agenda (`deadlines.ts`).
 *
 * Un bandeau au-dessus de la grille, et non de faux événements dedans : un
 * délai ne se glisse pas d'un jour à l'autre, il se change sur l'affaire, où
 * mène chaque ligne. Rien ne s'affiche quand la période n'en compte aucun — un
 * bandeau vide en permanence apprend à ne plus le regarder.
 */
export function DossierDeadlines({ from, to }: { from: Date; to: Date }) {
  const issuer = scopeParam(useScope()) ?? "";
  const { data } = useCached(`worksites:deadlines:${issuer}`, () => listWorksites("", issuer), LIVE);
  const [open, setOpen] = useState(true);
  const items = useMemo(
    () => deadlinesBetween(data?.items ?? [], localDay(from), localDay(to), todayLocal()),
    [data, from, to],
  );
  if (items.length === 0) return null;
  const late = items.filter((d) => d.late).length;

  return (
    <div className="border-b px-3 py-2" data-demo="agenda-delais">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left text-xs font-semibold"
      >
        <FlagIcon className="size-3.5" />
        Délais des dossiers · {items.length}
        {late > 0 && <span className="text-danger">dont {late} dépassé{late > 1 ? "s" : ""}</span>}
        <ChevronDownIcon className={cn("ml-auto size-3.5 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {items.map((d) => (
            <li key={`${d.worksiteId}:${d.kind}`} className="shrink-0">
              <Link
                href={`/customers/${d.customerId}?affaire=${d.worksiteId}`}
                className={cn(
                  "hover:bg-accent/40 flex max-w-64 flex-col rounded-md border border-l-4 px-2 py-1 text-[11px]",
                  d.late ? "border-l-danger" : d.kind === "promis" ? "border-l-warning" : "border-l-info",
                )}
              >
                <span className={cn("font-semibold tabular-nums", d.late && "text-danger")}>
                  {formatDate(d.day)} · {d.kind === "promis" ? "promis au client" : "deadline interne"}
                </span>
                <span className="truncate font-medium">{d.customerName}</span>
                <span className="text-muted-foreground truncate">
                  {projectReference(d.reference, d.metier)} · {d.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
