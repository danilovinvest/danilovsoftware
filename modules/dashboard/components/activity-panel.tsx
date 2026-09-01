import { ActivityIcon } from "lucide-react";
import { EnumBadge, INTERACTION_KIND } from "@/modules/customers";
import { formatRelative } from "@/shared/lib/format";
import type { ActivityRow } from "../lib/types";
import { Panel } from "./ui";

/** Ce qui s'est passé récemment, toutes fiches confondues. */
export function ActivityPanel({ rows }: { rows: ActivityRow[] }) {
  return (
    <Panel
      title="Activité récente"
      description="Derniers échanges enregistrés par l'équipe"
      icon={ActivityIcon}
      tone="info"
      bodyClassName="divide-y"
    >
      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-2 px-4 py-2">
          <EnumBadge
            value={row.kind}
            entries={INTERACTION_KIND}
            className="mt-0.5 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{row.customer_name}</p>
            <p className="text-muted-foreground truncate text-[11px]">{row.summary}</p>
          </div>
          <span
            className="text-muted-foreground/70 shrink-0 text-[11px]"
            title={row.author_name}
          >
            {formatRelative(row.at)}
          </span>
        </div>
      ))}
    </Panel>
  );
}
