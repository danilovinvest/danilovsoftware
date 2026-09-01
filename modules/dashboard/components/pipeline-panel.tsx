import { GaugeIcon } from "lucide-react";
import { PROJECT_STAGE } from "@/modules/customers";
import type { StageBucket } from "../lib/types";
import { euros, eurosShort } from "@/shared/lib/format";
import { Meter, Panel } from "@/shared/ui/panel";

/**
 * Le pipeline dans l'ordre des étapes — pas trié par volume.
 *
 * Un entonnoir se lit dans le sens du parcours : c'est l'endroit où il se
 * pince qui apprend quelque chose, et trier par taille effacerait justement
 * cette information.
 */
export function PipelinePanel({ buckets }: { buckets: StageBucket[] }) {
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);
  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);
  const affairs = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <Panel
      title="Pipeline"
      description={`${affairs} affaires ouvertes · ${euros(total)} en jeu`}
      icon={GaugeIcon}
      tone="info"
      bodyClassName="flex flex-col gap-2.5 p-4"
    >
      {buckets.map((bucket) => {
        const entry = PROJECT_STAGE[bucket.stage];
        return (
          <div key={bucket.stage} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
            <span className="truncate text-xs">{entry.label}</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {bucket.count} · {eurosShort(bucket.amount)}
            </span>
            <div className="col-span-2">
              <Meter value={bucket.count} max={maxCount} tone={entry.tone} />
            </div>
          </div>
        );
      })}
    </Panel>
  );
}
