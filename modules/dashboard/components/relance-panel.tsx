"use client";

import { useState } from "react";
import { AlarmClockIcon, CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/ui/feedback";
import { euros, eurosShort, plural } from "@/shared/lib/format";
import { Panel, RowShell, ScorePill } from "@/shared/ui/panel";
import { scoreTone } from "../lib/labels";
import type { RelanceRow } from "../lib/types";

/**
 * Les devis à relancer, du plus rentable au moins rentable.
 *
 * Le classement n'est pas l'ancienneté. Un devis parti il y a six mois sans
 * réponse ne se rattrape plus ; un devis de 100 000 € parti il y a cinq
 * semaines, si. Le score croise donc l'enjeu et ce qu'il reste de fenêtre —
 * trier par date décroissante, le réflexe naturel, mettrait les dossiers les
 * plus morts en tête de liste.
 */
export function RelancePanel({
  rows,
  total,
  className,
}: {
  rows: RelanceRow[];
  /** Nombre de devis dans la fenêtre, avant plafonnement de la liste. */
  total: number;
  className?: string;
}) {
  // Le CRM enregistre les relances d'un clic ; ici rien ne part au serveur, on
  // retire simplement la ligne traitée.
  const [done, setDone] = useState<Record<string, boolean>>({});
  const pending = rows.filter((row) => !done[row.project_id]);
  const amount = pending.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Panel
      title="À relancer en priorité"
      description={
        total === 0
          ? "Rien en attente dans la fenêtre utile"
          : `${plural(total, "devis", "devis")} en attente · ${euros(amount)} sur les ${pending.length} premiers`
      }
      icon={AlarmClockIcon}
      tone="danger"
      className={className}
      bodyClassName="divide-y"
    >
      {pending.length === 0 ? (
        <EmptyState
          title="Aucun devis à relancer"
          description="Tous les devis en attente sont soit trop récents, soit trop anciens pour qu'une relance change quelque chose."
        />
      ) : (
        pending.map((row) => (
          <RowShell key={row.project_id}>
            <ScorePill
              score={row.urgency}
              tone={scoreTone(row.urgency)}
              title={`Priorité ${row.urgency}/100 — ${row.days_since} jours d'attente pour ${euros(row.amount)} HT`}
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={cn(
                    "truncate text-sm font-medium",
                    !row.named && "text-muted-foreground italic",
                  )}
                >
                  {row.customer_name}
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  {row.reference}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {eurosShort(row.amount)}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {row.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  row.urgency >= 70 ? "text-danger" : "text-muted-foreground",
                )}
              >
                {row.reason}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0"
              onClick={() => setDone((state) => ({ ...state, [row.project_id]: true }))}
            >
              <CheckCircle2Icon className="size-3.5" />
              Relancé
            </Button>
          </RowShell>
        ))
      )}
    </Panel>
  );
}
