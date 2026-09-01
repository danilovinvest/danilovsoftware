import { UsersIcon } from "lucide-react";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { eurosShort, initials, plural } from "@/shared/lib/format";
import type { WorkloadRow } from "../lib/types";
import { Meter, Panel } from "@/shared/ui/panel";

/**
 * Répartition de la charge.
 *
 * Le nombre d'affaires ne dit pas grand-chose seul — c'est la ligne
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
        <div key={row.owner_name} className="flex flex-col gap-1.5 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <GradientAvatar
              seed={row.owner_name}
              text={initials(row.owner_name)}
              size={22}
            />
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {row.owner_name}
            </span>
            <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
              <span className="text-foreground font-medium">{row.open_projects}</span>{" "}
              affaires · {eurosShort(row.amount_open)}
            </span>
          </div>

          <Meter
            value={row.open_projects}
            max={max}
            tone={row.late_relances > 1 ? "warning" : "info"}
          />

          <p className="text-muted-foreground text-[11px]">
            {row.late_relances > 0 ? (
              <span className="text-danger">
                {plural(row.late_relances, "relance")} en retard
              </span>
            ) : (
              <span>Relances à jour</span>
            )}
            {" · "}
            {row.overdue_tasks > 0 ? (
              <span className="text-warning">
                {plural(row.overdue_tasks, "tâche")} en retard
              </span>
            ) : (
              <span>{plural(row.open_tasks, "tâche")}</span>
            )}
          </p>
        </div>
      ))}
    </Panel>
  );
}
