import { CompassIcon } from "lucide-react";
import { CUSTOMER_SOURCE } from "@/modules/customers";
import type { SourceBucket } from "../lib/types";
import { eurosShort, plural } from "@/shared/lib/format";
import { Meter, Panel } from "@/shared/ui/panel";

/**
 * D'où viennent les demandes, et lesquelles se transforment.
 *
 * Le volume seul induit en erreur : une source qui apporte deux demandes dont
 * deux signées vaut mieux qu'une source qui en apporte dix dont zéro. Les deux
 * chiffres sont donc toujours donnés ensemble.
 *
 * Fenêtre fixe de douze mois, indépendante du sélecteur de période : sur
 * trente jours, un mélange de sources ne veut rien dire.
 */
export function SourcesPanel({ buckets }: { buckets: SourceBucket[] }) {
  const max = Math.max(...buckets.map((bucket) => bucket.requests), 1);

  return (
    <Panel
      title="Origine des demandes"
      description="Sur 12 mois, avec ce que chaque canal a réellement rapporté"
      icon={CompassIcon}
      tone="neutral"
      bodyClassName="flex flex-col gap-3 p-4"
    >
      {buckets.map((bucket) => {
        const rate = bucket.requests > 0 ? Math.round((bucket.won / bucket.requests) * 100) : 0;
        return (
          <div key={bucket.source} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
            <span className="truncate text-xs">
              {CUSTOMER_SOURCE[bucket.source].label}
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {plural(bucket.requests, "demande")} · {rate} % signées
            </span>
            <div className="col-span-2 flex items-center gap-2">
              <Meter
                value={bucket.requests}
                max={max}
                tone={rate >= 50 ? "success" : rate > 0 ? "info" : "neutral"}
              />
              <span className="text-muted-foreground w-14 shrink-0 text-right text-[11px] tabular-nums">
                {eurosShort(bucket.amount)}
              </span>
            </div>
          </div>
        );
      })}
    </Panel>
  );
}
