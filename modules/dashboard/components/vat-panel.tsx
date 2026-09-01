import { PercentIcon } from "lucide-react";
import { euros, plural } from "@/shared/lib/format";
import { Meter, Panel } from "@/shared/ui/panel";
import type { VatBucket } from "../lib/types";

/**
 * Répartition par taux de TVA.
 *
 * C'est la seule nature de travaux que l'export porte, et elle en dit
 * beaucoup : le taux réduit signale la rénovation de logements de plus de deux
 * ans, le taux normal le neuf et le professionnel, le taux nul la
 * sous-traitance en autoliquidation. Trois marchés, trois façons de vendre.
 */
export function VatPanel({ buckets }: { buckets: VatBucket[] }) {
  const max = Math.max(...buckets.map((bucket) => bucket.amount), 1);
  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);

  return (
    <Panel
      title="Répartition par taux de TVA"
      description={`${euros(total)} HT sur l'ensemble des devis de l'export`}
      icon={PercentIcon}
      tone="warning"
      bodyClassName="flex flex-col gap-3 p-4"
    >
      {buckets.map((bucket) => (
        <div key={bucket.rate} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
          <span className="text-xs font-medium">{bucket.label}</span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {plural(bucket.count, "devis", "devis")} · {euros(bucket.amount)}
          </span>
          <p className="text-muted-foreground col-span-2 text-[11px]">{bucket.hint}</p>
          <div className="col-span-2">
            <Meter
              value={bucket.amount}
              max={max}
              tone={bucket.rate === 10 ? "info" : bucket.rate === 20 ? "warning" : "neutral"}
            />
          </div>
        </div>
      ))}
    </Panel>
  );
}
