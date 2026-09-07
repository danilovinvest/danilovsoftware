import { FlameIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/ui/feedback";
import { agoLabel, eurosShort } from "@/shared/lib/format";
import { Meter, Panel, RowShell, ScorePill } from "@/shared/ui/panel";
import { heatTone } from "../lib/labels";
import type { HotRow } from "../lib/types";

/**
 * Les devis partis dans les trois dernières semaines.
 *
 * Un devis dans cette fenêtre n'est pas à relancer : le client est en train de
 * le lire, d'en parler à son architecte ou à sa banque. Il est à surveiller, ce
 * qui n'est pas la même action — d'où deux listes et non une seule triée
 * autrement.
 */
export function HotPanel({ rows }: { rows: HotRow[] }) {
  return (
    <Panel
      title="Devis en cours de lecture"
      description="Partis il y a moins de trois semaines — trop tôt pour relancer"
      icon={FlameIcon}
      tone="success"
      bodyClassName="divide-y"
    >
      {rows.length === 0 ? (
        <EmptyState
          title="Aucun devis récent"
          description="Rien n'est parti chez un client ces trois dernières semaines."
        />
      ) : (
        rows.map((row) => (
          <RowShell key={row.project_id} className="flex-col items-stretch gap-2">
            <div className="flex items-start gap-3">
              <ScorePill
                score={row.temperature}
                tone={heatTone(row.temperature)}
                title={`Température ${row.temperature}/100`}
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
                </div>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {row.label}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium tabular-nums">
                  {eurosShort(row.amount)}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  parti {agoLabel(row.days_since)}
                </p>
              </div>
            </div>

            <Meter
              value={row.temperature}
              max={100}
              tone={heatTone(row.temperature)}
              className="h-1"
            />

            <div className="flex flex-wrap gap-1">
              {row.signals.map((signal) => (
                <span
                  key={signal}
                  className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[11px]"
                >
                  {signal}
                </span>
              ))}
            </div>
          </RowShell>
        ))
      )}
    </Panel>
  );
}
