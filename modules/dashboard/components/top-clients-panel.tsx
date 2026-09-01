import { TrophyIcon } from "lucide-react";
import { CUSTOMER_KIND } from "@/modules/customers";
import { cn } from "@/lib/utils";
import { eurosShort, initials, plural, sinceDays } from "@/shared/lib/format";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { Meter, Panel } from "@/shared/ui/panel";
import type { TopClient } from "../lib/types";

/**
 * Les fiches qui pèsent le plus, signé et en attente confondus.
 *
 * Les deux montants sont donnés séparément parce qu'ils n'ont pas la même
 * valeur : un client à 300 000 € de devis en attente et zéro signé n'est pas
 * un bon client, c'est un risque de concentration.
 */
export function TopClientsPanel({ rows }: { rows: TopClient[] }) {
  const max = Math.max(...rows.map((row) => row.signed + row.pending), 1);

  return (
    <Panel
      title="Clients les plus engagés"
      description="Montant HT cumulé des devis, signés et en attente"
      icon={TrophyIcon}
      tone="success"
      bodyClassName="divide-y"
    >
      {rows.map((row) => (
        <div key={row.customer_id} className="flex flex-col gap-1.5 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <GradientAvatar seed={row.name} text={initials(row.name)} size={22} />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-xs font-medium",
                  !row.named && "text-muted-foreground italic",
                )}
              >
                {row.name}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {CUSTOMER_KIND[row.kind].label} ·{" "}
                {plural(row.quotes, "devis", "devis")} · dernier il y a{" "}
                {sinceDays(row.days_since)}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium tabular-nums">
              {eurosShort(row.signed + row.pending)}
            </span>
          </div>

          {/* Deux segments : ce qui est acquis, ce qui ne l'est pas encore. */}
          <div className="bg-muted flex h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-success h-full"
              style={{ width: `${(row.signed / max) * 100}%` }}
              title={`${eurosShort(row.signed)} signés`}
            />
            <div
              className="bg-info h-full opacity-40"
              style={{ width: `${(row.pending / max) * 100}%` }}
              title={`${eurosShort(row.pending)} en attente`}
            />
          </div>
          <p className="text-muted-foreground text-[11px] tabular-nums">
            {row.signed > 0 ? (
              <span className="text-success">{eurosShort(row.signed)} signés</span>
            ) : (
              <span>Rien de signé</span>
            )}
            {" · "}
            {row.pending > 0 ? `${eurosShort(row.pending)} en attente` : "rien en attente"}
          </p>
        </div>
      ))}
      <div className="hidden">
        <Meter value={0} max={1} />
      </div>
    </Panel>
  );
}
