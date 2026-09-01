import { GaugeIcon } from "lucide-react";
import { PROJECT_STAGE } from "@/modules/customers";
import { euros, eurosShort, plural } from "@/shared/lib/format";
import { Meter, Panel } from "@/shared/ui/panel";
import type { StageBucket } from "../lib/types";

/**
 * Les devis par étape, dans l'ordre du parcours.
 *
 * Seules trois étapes existent dans l'export — envoyé, gagné, réalisé — parce
 * que c'est tout ce que le statut d'origine distingue. Afficher les huit
 * étapes du pipeline avec cinq barres à zéro laisserait croire à un suivi qui
 * n'a pas encore lieu.
 */
export function PipelinePanel({ buckets }: { buckets: StageBucket[] }) {
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);
  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);
  const count = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <Panel
      title="Devis par étape"
      description={`${plural(count, "devis", "devis")} · ${euros(total)} HT au total`}
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
