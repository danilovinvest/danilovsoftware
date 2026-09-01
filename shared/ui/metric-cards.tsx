"use client";

import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { euros } from "@/shared/lib/format";
import { Sparkline } from "./panel";

/**
 * Rangée de compteurs, partagée par les écrans de synthèse.
 *
 * Le type est déclaré ici et non dans un module : TypeScript étant structurel,
 * n'importe quel module peut passer ses propres compteurs du moment qu'ils ont
 * cette forme — aucun des deux n'a besoin de connaître l'autre.
 */
export type Metric = {
  key: string;
  label: string;
  /** Ce que le chiffre veut dire — un KPI sans définition ment. */
  hint: string;
  value: number;
  /** Mesure précédente, ou null quand la comparaison n'a pas de sens. */
  previous: number | null;
  /** Ce qu'on affiche à la place de l'écart quand `previous` est nul. */
  note?: string;
  format: "amount" | "count" | "percent";
  /** Douze points mensuels, du plus ancien au plus récent. */
  trend: number[];
  /** Ce que la courbe montre — une sparkline sans légende raconte n'importe quoi. */
  trend_label: string;
};

/** Un compteur brut ne dit rien : c'est l'écart qui informe. */
function Delta({
  value,
  previous,
  note,
}: {
  value: number;
  previous: number | null;
  note?: string;
}) {
  if (previous === null) {
    return <span className="text-muted-foreground text-xs">{note ?? "Sans comparaison"}</span>;
  }

  // Passer de rien à quelque chose n'est pas « +∞ % » : on le dit en toutes
  // lettres plutôt que d'afficher un pourcentage faux.
  if (previous === 0) {
    return (
      <span className={cn("text-xs", value > 0 ? "text-success" : "text-muted-foreground")}>
        {value > 0 ? "Nouveau sur la période" : "Rien sur les deux périodes"}
      </span>
    );
  }

  const ratio = Math.round(((value - previous) / previous) * 100);
  const Icon = ratio > 0 ? ArrowUpRightIcon : ratio < 0 ? ArrowDownRightIcon : MinusIcon;
  const tone =
    ratio > 0 ? "text-success" : ratio < 0 ? "text-danger" : "text-muted-foreground";

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", tone)}>
      <Icon className="size-3" />
      {ratio > 0 ? "+" : ""}
      {ratio} %
      <span className="text-muted-foreground ml-1 font-normal">
        vs période précédente
      </span>
    </span>
  );
}

function display(metric: Metric): string {
  if (metric.format === "amount") return euros(metric.value);
  if (metric.format === "percent") return `${metric.value} %`;
  return String(metric.value);
}

export function MetricCards({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.key} className="gap-0 py-3">
          <div className="flex flex-col gap-1 px-4">
            <p
              className="text-muted-foreground truncate text-xs"
              title={metric.hint}
            >
              {metric.label}
            </p>
            <p className="text-xl font-semibold tabular-nums">{display(metric)}</p>
            <Delta value={metric.value} previous={metric.previous} note={metric.note} />
          </div>
          <div className="mt-2 px-2">
            <Sparkline
              id={metric.key}
              points={metric.trend}
              tone={metric.format === "amount" ? "info" : "success"}
            />
          </div>
          <p className="text-muted-foreground/70 mt-1 px-4 text-[10px]">
            {metric.trend_label}
          </p>
        </Card>
      ))}
    </div>
  );
}
