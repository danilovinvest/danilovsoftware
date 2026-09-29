"use client";

import { cn } from "@/lib/utils";
import { HUE } from "@/shared/ui/hue";
import { CATEGORY_META } from "../lib/categories";
import type { GraphStats } from "../lib/stats";

/**
 * La barre des chiffres : ce que la toile montre, compté.
 *
 * Les cinq fiches les plus connectées sont des boutons — c'est la question
 * qu'on pose en ouvrant un graphe (« qui tient le plus de monde ? ») et la
 * réponse doit mener au nœud, pas seulement le nommer.
 */
export function GraphStatsBar({ stats, onPick }: { stats: GraphStats; onPick: (id: string) => void }) {
  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-xs"
      data-demo="graphe-chiffres"
    >
      <Figure value={stats.fiches} label={stats.fiches > 1 ? "fiches" : "fiche"} />
      <Figure value={stats.edges} label={stats.edges > 1 ? "liens" : "lien"} />
      {stats.interlocuteurs > 0 && (
        <Figure value={stats.interlocuteurs} label={stats.interlocuteurs > 1 ? "interlocuteurs communs" : "interlocuteur commun"} />
      )}
      <Figure
        value={stats.components}
        label={stats.components > 1 ? "groupes reliés" : "groupe relié"}
        title={stats.largest > 0 ? `Le plus grand compte ${stats.largest} nœuds` : undefined}
      />
      {stats.top.length > 0 && (
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <span className="text-muted-foreground mr-0.5">Les plus connectées :</span>
          {stats.top.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => onPick(node.id)}
              className="hover:bg-muted inline-flex max-w-44 items-center gap-1.5 rounded-md border px-1.5 py-0.5"
              title={`${node.label} — ${node.fiche?.degree ?? 0} connexions`}
            >
              <span className={cn("size-2 shrink-0 rounded-full", HUE[CATEGORY_META[node.category].hue].solid)} />
              <span className="truncate">{node.label}</span>
              <span className="text-muted-foreground tabular-nums">{node.fiche?.degree ?? 0}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Figure({ value, label, title }: { value: number; label: string; title?: string }) {
  return (
    <span className="whitespace-nowrap" title={title}>
      <span className="font-semibold tabular-nums">{value.toLocaleString("fr-FR")}</span>{" "}
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
