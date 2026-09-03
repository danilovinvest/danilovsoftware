"use client";

import { useState } from "react";
import { ChevronRightIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatElapsed } from "@/shared/lib/format";
import { EmptyState, Skeleton } from "@/shared/ui/feedback";
import { cardOf } from "../lib/cards";
import type { NodeType, Run } from "../lib/types";

const clock = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Le journal des exécutions.
 *
 * Une automatisation envoie des messages à des gens : savoir ce qui est parti,
 * quand, et pourquoi ça n'est pas parti n'est pas un confort de mise au point.
 * Une exécution sans envoi — journée sans rendez-vous — y figure comme les
 * autres : « rien n'a été envoyé » et « ça n'a pas tourné » sont deux pannes
 * différentes.
 */
export function RunJournal({
  runs,
  loading,
  onReload,
}: {
  runs: Run[];
  loading: boolean;
  onReload: () => void;
}) {
  return (
    <div className="bg-card shrink-0 rounded-xl border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-xs font-medium">Journal des exécutions</p>
        <Button variant="ghost" size="sm" className="h-6" onClick={onReload}>
          <RefreshCwIcon className="size-3" />
          Actualiser
        </Button>
      </div>

      {loading && runs.length === 0 ? (
        <Skeleton className="m-3 h-12" />
      ) : runs.length === 0 ? (
        <EmptyState
          title="Aucune exécution"
          description="« Essayer maintenant » en déclenche une sans attendre l'heure."
        />
      ) : (
        <div className="max-h-52 divide-y overflow-y-auto">
          {runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}

function RunRow({ run }: { run: Run }) {
  const [open, setOpen] = useState(false);
  const elapsed = run.finished_at
    ? new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()
    : null;
  const sent = run.error === "" && run.steps.some((step) => step.type === "telegram" && step.ok);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="hover:bg-accent/50 flex w-full items-center gap-3 px-3 py-1.5 text-left transition-colors">
        <ChevronRightIcon
          className={cn(
            "text-muted-foreground size-3.5 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
        <span className="w-24 shrink-0 font-mono text-[11px] tabular-nums">
          {clock.format(new Date(run.started_at))}
        </span>
        <span className="bg-muted text-muted-foreground w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px]">
          {run.origin === "manuelle" ? "essai manuel" : "programmée"}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs">
          {run.finished_at === null ? (
            <span className="text-info">en cours…</span>
          ) : run.error ? (
            <span className="text-danger">{run.error}</span>
          ) : sent ? (
            <span className="text-success">message envoyé</span>
          ) : (
            <span className="text-muted-foreground">terminée</span>
          )}
        </span>
        <span className="text-muted-foreground/70 w-16 shrink-0 text-right text-[11px] tabular-nums">
          {elapsed !== null ? formatElapsed(elapsed) : "—"}
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <ul className="bg-muted/20 flex flex-col gap-1 border-t px-3 py-2 pl-10">
          {run.steps.length === 0 && (
            <li className="text-muted-foreground text-[11px]">
              Aucune carte n&apos;a été traversée : le graphe a été refusé avant
              de démarrer.
            </li>
          )}
          {run.steps.map((step, index) => (
            <li key={`${step.node}-${index}`} className="flex items-baseline gap-2 text-[11px]">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  step.ok ? "bg-success" : "bg-danger",
                )}
              />
              <span className="w-40 shrink-0 truncate">
                {cardOf(step.type as NodeType).label}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1",
                  step.ok ? "text-muted-foreground" : "text-danger",
                )}
              >
                {step.detail}
              </span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
