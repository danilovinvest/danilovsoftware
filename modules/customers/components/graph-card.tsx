"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { HUE } from "@/shared/ui/hue";
import type { Hue } from "@/modules/shell";
import type { GraphFamily, GraphNode } from "../lib/graph";
import { TONE_CLASSES } from "./enum-badge";

/**
 * La teinte d'une famille de nœuds. Fixe comme celles des modules : c'est une
 * adresse, on reconnaît un paiement à son jade avant d'avoir lu le montant.
 */
export const FAMILY_HUE: Record<GraphFamily, Hue> = {
  client: "grass",
  prescripteur: "indigo",
  partenaire: "amber",
  fournisseur: "orange",
  personne: "pink",
  affaire: "cyan",
  piece: "violet",
  paiement: "jade",
  activite: "slate",
};

export const FAMILY_LABEL: Record<GraphFamily, string> = {
  client: "Client final",
  prescripteur: "Prescripteur (syndic, architecte…)",
  partenaire: "Partenaire technique, sous-traitant",
  fournisseur: "Fournisseur",
  personne: "Interlocuteur",
  affaire: "Affaire",
  piece: "Devis et factures",
  paiement: "Paiement",
  activite: "Activité (échanges, documents, tâches)",
};

export const CARD_WIDTH = 220;
export const ROOT_WIDTH = 260;

export type GraphCardData = GraphNode & {
  selected: boolean;
  /** Le clavier choisit une carte comme la souris : Entrée ou Espace. */
  onSelect: (id: string) => void;
};

/*
  L'estompage au survol n'est pas ici : il vit sur l'enveloppe du nœud
  (`customer-graph.tsx`). Le faire entrer dans `data` donnerait une nouvelle
  référence à chaque carte dès qu'on bouge la souris, et le `memo` ci-dessous
  ne servirait plus à rien.
*/

/**
 * Un nœud de la toile : un liseré à la teinte de sa famille, le nom, une ligne
 * de précision, et une pastille quand il y a quelque chose à dire.
 *
 * Le point orange en bas à droite dit « un champ manque » : on le voit sur la
 * toile entière, avant d'ouvrir quoi que ce soit.
 */
export const GraphCard = memo(function GraphCard({ data }: NodeProps) {
  const node = data as unknown as GraphCardData;
  const hue = HUE[FAMILY_HUE[node.family]];
  const missing = node.rows.some((row) => row.value === null);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${node.label}, ${node.sub}`}
      aria-pressed={node.selected}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          node.onSelect(node.id);
        }
      }}
      className={cn(
        "bg-card focus-visible:ring-ring relative flex cursor-pointer overflow-hidden rounded-lg border shadow-xs transition-opacity outline-none focus-visible:ring-2",
        node.root && "border-2",
        node.selected && "ring-foreground/60 ring-2",
      )}
      style={{ width: node.root ? ROOT_WIDTH : CARD_WIDTH }}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" isConnectable={false} />
      <span className={cn("w-1.5 shrink-0", hue.solid)} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2">
        <div className="flex items-start gap-2">
          <span className={cn("min-w-0 flex-1 truncate font-semibold", node.root ? "text-[15px]" : "text-sm")}>
            {node.label}
          </span>
          {node.tag && (
            <span className={cn("shrink-0 rounded-sm px-1.5 py-px text-[10px] font-medium", TONE_CLASSES[node.tag.tone])}>
              {node.tag.text}
            </span>
          )}
        </div>
        <span className="text-muted-foreground truncate font-mono text-[11px]">{node.sub}</span>
      </div>
      {missing && (
        <span
          className="bg-warning border-card absolute right-1 bottom-1 size-2.5 rounded-full border-2"
          title="Un champ est à renseigner"
        />
      )}
      <Handle type="source" position={Position.Right} className="!opacity-0" isConnectable={false} />
    </div>
  );
});
