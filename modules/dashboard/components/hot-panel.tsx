import { FlameIcon } from "lucide-react";
import { EnumBadge, PROJECT_STAGE } from "@/modules/customers";
import { EmptyState } from "@/shared/ui/feedback";
import { eurosShort, sinceDays } from "../lib/labels";
import type { HotRow } from "../lib/types";
import { Meter, Panel, RowShell, ScorePill, heatTone } from "./ui";

/**
 * Les affaires qui avancent — celles où l'effort a le meilleur rendement.
 *
 * Une affaire en retard de relance en est exclue par construction : elle a
 * déjà sa liste, et se retrouver dans les deux enverrait deux messages
 * contraires sur la même ligne.
 */
export function HotPanel({ rows }: { rows: HotRow[] }) {
  return (
    <Panel
      title="Affaires chaudes"
      description="Avancées, récemment touchées, avec un enjeu identifié"
      icon={FlameIcon}
      tone="success"
      bodyClassName="divide-y"
    >
      {rows.length === 0 ? (
        <EmptyState
          title="Rien de chaud en ce moment"
          description="Aucune affaire ouverte n'a été touchée récemment."
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
                  <span className="truncate text-sm font-medium">
                    {row.customer_name}
                  </span>
                  <EnumBadge value={row.stage} entries={PROJECT_STAGE} />
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
                  vu il y a {sinceDays(row.days_since)}
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
                  className="bg-muted text-muted-foreground rounded-[4px] px-1.5 py-0.5 text-[11px]"
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
