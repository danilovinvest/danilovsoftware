import { ActivityIcon } from "lucide-react";
import { EnumBadge, PROJECT_STAGE } from "@/modules/customers";
import { eurosShort, formatDate } from "@/shared/lib/format";
import { Panel } from "@/shared/ui/panel";
import type { ActivityRow } from "../lib/types";

/** Les derniers devis établis, toutes fiches confondues. */
export function ActivityPanel({ rows }: { rows: ActivityRow[] }) {
  return (
    <Panel
      title="Derniers devis établis"
      description="Statut d'origine de l'export en regard de l'étape déduite"
      icon={ActivityIcon}
      tone="info"
      bodyClassName="divide-y"
    >
      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-2 px-4 py-2">
          <EnumBadge
            value={row.stage}
            entries={PROJECT_STAGE}
            className="mt-0.5 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{row.customer_name}</p>
            <p className="text-muted-foreground truncate text-[11px]">
              <span className="font-mono">{row.reference}</span> · {row.label}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium tabular-nums">{eurosShort(row.amount)}</p>
            <p className="text-muted-foreground/70 text-[11px]">
              {formatDate(row.at)} · {row.source_status}
            </p>
          </div>
        </div>
      ))}
    </Panel>
  );
}
