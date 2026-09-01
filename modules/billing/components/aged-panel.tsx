import { HourglassIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { euros, eurosShort, plural } from "@/shared/lib/format";
import { Meter, Panel } from "@/shared/ui/panel";
import type { AgedBucket } from "../lib/types";

/**
 * Balance âgée : le même encours, rangé par ancienneté de l'impayé.
 *
 * C'est le classement qui décide de l'action, pas le montant. Une créance de
 * quinze jours se relance par e-mail, une créance de quatre mois se traite
 * autrement — et il n'existe pas de seuil unique qui vaille pour les deux.
 */
const TONE = ["neutral", "info", "warning", "danger", "danger"] as const;

export function AgedPanel({ buckets }: { buckets: AgedBucket[] }) {
  const max = Math.max(...buckets.map((bucket) => bucket.amount), 1);
  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);
  const late = buckets
    .filter((bucket) => bucket.key !== "a_echoir")
    .reduce((sum, bucket) => sum + bucket.amount, 0);

  return (
    <Panel
      title="Balance âgée"
      description={
        total === 0
          ? "Aucun encours"
          : `${euros(total)} d'encours, dont ${euros(late)} échus`
      }
      icon={HourglassIcon}
      tone={late > 0 ? "danger" : "neutral"}
      bodyClassName="flex flex-col gap-3 p-4"
    >
      {buckets.map((bucket, index) => (
        <div key={bucket.key} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
          <span
            className={cn(
              "text-xs",
              bucket.key === "90_plus" && bucket.amount > 0 && "text-danger font-medium",
            )}
          >
            {bucket.label}
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {bucket.count > 0 ? plural(bucket.count, "facture") : "—"} ·{" "}
            {eurosShort(bucket.amount)}
          </span>
          <div className="col-span-2">
            <Meter value={bucket.amount} max={max} tone={TONE[index]} />
          </div>
        </div>
      ))}
    </Panel>
  );
}
