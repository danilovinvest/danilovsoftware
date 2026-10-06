"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ExternalLinkIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CUSTOMER_KIND, CUSTOMER_STATUS } from "@/modules/customers";
import { cn } from "@/lib/utils";
import { HUE } from "@/shared/ui/hue";
import { CATEGORY_META } from "../lib/categories";
import type { GraphModel, ModelNode } from "../lib/model";
import { neighbourGroups } from "../lib/neighbours";

/**
 * Le panneau du nœud choisi : qui c'est, combien de connexions, et ses voisins
 * rangés par nature du lien — « A pour syndic », « Affaires apportées par »,
 * « Interlocuteurs communs ». Chaque voisin se choisit à son tour : on suit un
 * fil d'une fiche à l'autre sans quitter la toile.
 */
export function GraphSelectionPanel({
  model,
  node,
  onPick,
  onClose,
}: {
  model: GraphModel;
  node: ModelNode;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const groups = useMemo(() => neighbourGroups(model, node.id), [model, node.id]);
  const meta = CATEGORY_META[node.category];
  const fiche = node.fiche;

  return (
    <div className="flex min-h-0 flex-col gap-3 text-sm" data-demo="graphe-selection">
      <div className="flex items-start gap-2">
        <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", HUE[meta.hue].solid)} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug break-words">{node.label}</p>
          <p className="text-muted-foreground text-xs">
            {meta.label}
            {fiche && ` · ${CUSTOMER_KIND[fiche.kind]?.label ?? fiche.kind}`}
            {fiche?.reference && ` · ${fiche.reference}`}
          </p>
        </div>
        <Button variant="ghost" size="icon-xs" aria-label="Fermer" onClick={onClose}>
          <XIcon />
        </Button>
      </div>

      {fiche ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <Fact label="Connexions" value={String(fiche.degree)} />
          <Fact label="Affaires" value={String(fiche.projects_count)} />
          <Fact label="Ville" value={fiche.city || "—"} />
          <Fact label="Statut" value={`${CUSTOMER_STATUS[fiche.status]?.label ?? fiche.status}${fiche.archived ? " · archivée" : ""}`} />
        </dl>
      ) : (
        node.hub && (
          <p className="text-muted-foreground text-xs break-all">
            {node.hub.identifiers.join(" · ")} — présent sur {node.hub.fiches.length} fiches
          </p>
        )
      )}

      {fiche && (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/customers/${fiche.id}`}>
              <ExternalLinkIcon />
              Ouvrir la fiche
            </Link>
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        {groups.length === 0 && <p className="text-muted-foreground text-xs">Aucun lien connu pour cette fiche.</p>}
        {groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-1">
            <h3 className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
              {group.title}
              <span className="font-normal normal-case">({group.items.length})</span>
              {group.inferred && <span className="font-normal normal-case italic">· déduit</span>}
            </h3>
            <ul className="flex flex-col">
              {group.items.map(({ node: other, detail }) => (
                <li key={`${group.key}:${other.id}`}>
                  <button
                    type="button"
                    onClick={() => onPick(other.id)}
                    className="hover:bg-muted flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs"
                  >
                    <span className={cn("size-2 shrink-0 rounded-full", HUE[CATEGORY_META[other.category].hue].solid)} />
                    <span className="min-w-0 flex-1 truncate">{other.label}</span>
                    {detail && <span className="text-muted-foreground max-w-32 shrink-0 truncate">{detail}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
