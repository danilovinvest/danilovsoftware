"use client";

import { useState } from "react";
import { AlarmClockIcon, CheckCircle2Icon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnumBadge, PROJECT_STAGE } from "@/modules/customers";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/ui/feedback";
import { eurosShort } from "../lib/labels";
import type { RelanceRow } from "../lib/types";
import { Panel, RowShell, ScorePill, scoreTone } from "./ui";

/**
 * Les affaires qui ont dépassé le délai de relance de leur étape, la plus
 * pressante en tête.
 *
 * Le seuil est relatif à l'étape et non global : huit jours de silence sur un
 * devis envoyé sont un problème, huit jours sur une étude en production sont
 * normaux. C'est ce qui fait la différence entre une liste qu'on ouvre le
 * matin et une liste qu'on finit par ignorer.
 */
export function RelancePanel({ rows }: { rows: RelanceRow[] }) {
  // Le CRM enregistre les relances d'un clic ; ici rien ne part au serveur, on
  // se contente de retirer la ligne pour que la démonstration se joue.
  const [done, setDone] = useState<Record<string, boolean>>({});

  const pending = rows.filter((row) => !done[row.project_id]);
  const total = pending.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Panel
      title="À relancer en priorité"
      description={
        pending.length === 0
          ? "Rien en souffrance"
          : `${pending.length} affaires au-delà du délai · ${eurosShort(total)} en jeu`
      }
      icon={AlarmClockIcon}
      tone="danger"
      bodyClassName="divide-y"
    >
      {pending.length === 0 ? (
        <EmptyState
          title="Aucune relance en retard"
          description="Toutes les affaires ouvertes ont été touchées dans les délais de leur étape."
        />
      ) : (
        pending.map((row) => (
          <RowShell key={row.project_id}>
            <ScorePill
              score={row.urgency}
              tone={scoreTone(row.urgency)}
              title={`Urgence ${row.urgency}/100 — ${row.days_since} jours de silence pour un seuil de ${row.threshold}`}
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate text-sm font-medium">{row.customer_name}</span>
                <EnumBadge value={row.stage} entries={PROJECT_STAGE} />
                {row.amount > 0 && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {eurosShort(row.amount)}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {row.label} · {row.city}
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

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                asChild
                title={`Appeler ${row.customer_name}`}
              >
                <a href={`tel:${row.phone}`}>
                  <PhoneIcon className="size-3.5" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => setDone((state) => ({ ...state, [row.project_id]: true }))}
              >
                <CheckCircle2Icon className="size-3.5" />
                Relancé
              </Button>
            </div>
          </RowShell>
        ))
      )}
    </Panel>
  );
}
