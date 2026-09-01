import { UsersIcon } from "lucide-react";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { initials } from "@/shared/lib/format";
import { eurosShort } from "../lib/labels";
import type { WorkloadRow } from "../lib/types";
import { Meter, Panel } from "./ui";

/**
 * Répartition de la charge.
 *
 * Le nombre d'affaires ne dit pas grand-chose seul — c'est la colonne
 * « relances en retard » qui identifie celui qui décroche.
 */
export function WorkloadPanel({ rows }: { rows: WorkloadRow[] }) {
  const max = Math.max(...rows.map((row) => row.open_projects), 1);

  return (
    <Panel
      title="Charge de l'équipe"
      description="Affaires ouvertes, retards de relance et tâches en cours"
      icon={UsersIcon}
      tone="neutral"
      bodyClassName="divide-y"
    >
      {rows.map((row) => (
        <div key={row.owner_name} className="flex items-center gap-3 px-4 py-2.5">
          <GradientAvatar
            seed={row.owner_name}
            text={initials(row.owner_name)}
            size={24}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{row.owner_name}</p>
            <div className="mt-1">
              <Meter
                value={row.open_projects}
                max={max}
                tone={row.late_relances > 1 ? "warning" : "info"}
              />
            </div>
          </div>
          <div className="text-muted-foreground shrink-0 text-right text-[11px] tabular-nums">
            <p>
              <span className="text-foreground font-medium">{row.open_projects}</span>{" "}
              affaires · {eurosShort(row.amount_open)}
            </p>
            <p>
              {row.late_relances > 0 ? (
                <span className="text-danger">{row.late_relances} relances en retard</span>
              ) : (
                <span>Relances à jour</span>
              )}
              {" · "}
              {row.overdue_tasks > 0 ? (
                <span className="text-warning">{row.overdue_tasks} tâches en retard</span>
              ) : (
                <span>{row.open_tasks} tâches</span>
              )}
            </p>
          </div>
        </div>
      ))}
    </Panel>
  );
}
