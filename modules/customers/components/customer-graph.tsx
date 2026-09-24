"use client";

import { useCallback, useMemo, useState } from "react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import { LIVE, useCached } from "@/shared/api/cache";
import { HUE } from "@/shared/ui/hue";
import * as api from "../lib/api";
import { buildGraph, type EdgeStyle, type GraphFamily, type GraphLayer } from "../lib/graph";
import type { CustomerDetail } from "../lib/types";
import { CARD_WIDTH, FAMILY_HUE, FAMILY_LABEL, GraphCard, ROOT_WIDTH } from "./graph-card";
import { GraphPanel } from "./graph-panel";

const NODE_TYPES = { card: GraphCard };

/*
  Le trait dit la nature du lien, et suit le thème : des variables, jamais une
  couleur littérale. Plein pour un lien direct, tirets pour « apporté par »,
  pointillés pour un partenaire croisé ailleurs, jade pour l'argent.
*/
const EDGE_STYLE: Record<EdgeStyle, React.CSSProperties> = {
  direct: { stroke: "var(--muted-foreground)", strokeOpacity: 0.45, strokeWidth: 1.4 },
  apport: { stroke: "var(--h-indigo-9)", strokeDasharray: "6 5", strokeWidth: 1.6 },
  transverse: { stroke: "var(--h-amber-9)", strokeDasharray: "3 4", strokeWidth: 1.4 },
  finance: { stroke: "var(--h-jade-9)", strokeWidth: 1.6 },
};

const LAYERS: Array<{ id: Exclude<GraphLayer, "coeur">; label: string; family: GraphFamily }> = [
  { id: "relations", label: "Relations", family: "prescripteur" },
  { id: "finances", label: "Pièces et paiements", family: "piece" },
  { id: "activite", label: "Activité", family: "activite" },
];

/**
 * La fiche en graphe : le syndic et ses autres immeubles, les interlocuteurs,
 * les affaires, leurs pièces et leurs paiements, sur un seul plan.
 *
 * `buildGraph` décide de tout — nœuds, liens, positions — et la toile ne fait
 * que dessiner. Les nœuds ne se déplacent pas : une disposition qu'on peut
 * défaire à la souris se retrouve différente à chaque ouverture, et on cherche
 * alors ce qu'on avait vu. On se déplace et on zoome, c'est tout.
 */
export function CustomerGraph({ customer, onChanged }: { customer: CustomerDetail; onChanged: () => void }) {
  const {
    data: relations,
    error: relationsError,
    mutate,
  } = useCached(`customers:relations:${customer.id}`, () => api.getCustomerRelations(customer.id), LIVE);
  const graph = useMemo(() => buildGraph(customer, relations ?? null), [customer, relations]);

  const [shown, setShown] = useState<Record<GraphLayer, boolean>>({
    coeur: true,
    relations: true,
    finances: true,
    activite: true,
  });
  const [selectedId, setSelectedId] = useState("root");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const visible = useMemo(() => graph.nodes.filter((n) => shown[n.layer]), [graph, shown]);
  const visibleIds = useMemo(() => new Set(visible.map((n) => n.id)), [visible]);
  const edges = useMemo(
    () => graph.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    [graph, visibleIds],
  );
  const neighborsOf = useCallback(
    (id: string) =>
      new Set(edges.flatMap((e) => (e.source === id ? [e.target] : e.target === id ? [e.source] : []))),
    [edges],
  );

  const focus = useMemo(
    () => (hoveredId ? neighborsOf(hoveredId).add(hoveredId) : null),
    [hoveredId, neighborsOf],
  );
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

  /*
    L'estompage ne passe pas par les données de la carte, et c'est ce qui rend
    le `memo` de GraphCard utile.

    Un survol ne change que `focus`, mais s'il entre dans `data`, tout le
    tableau est reconstruit et chaque objet reçoit une nouvelle référence : la
    comparaison superficielle du `memo` échoue partout, et **toutes** les cartes
    visibles se redessinent à chaque déplacement de souris sur la toile — ce
    que le commentaire d'origine croyait justement éviter. Relevé en relecture.
    L'opacité est une affaire d'affichage : elle vit donc sur l'enveloppe du
    nœud, que React Flow nous laisse habiller, et `data` ne dépend plus que du
    nœud et de la sélection.
  */
  const cartes: Node[] = useMemo(
    () =>
      visible.map((n) => ({
        id: n.id,
        type: "card",
        position: { x: n.x - (n.root ? ROOT_WIDTH : CARD_WIDTH) / 2, y: n.y - 24 },
        draggable: false,
        connectable: false,
        data: { ...n, selected: n.id === selectedId, onSelect: setSelectedId },
      })),
    [visible, selectedId],
  );
  const flowNodes: Node[] = useMemo(
    () =>
      cartes.map((carte) =>
        focus !== null && !focus.has(carte.id)
          ? { ...carte, className: "opacity-20 transition-opacity" }
          : { ...carte, className: "transition-opacity" },
      ),
    [cartes, focus],
  );
  const flowEdges: Edge[] = useMemo(() => edges.map((e) => {
    const from = byId.get(e.source);
    const to = byId.get(e.target);
    // Le trait part toujours de la gauche vers la droite : les poignées sont
    // sur les flancs, et un lien vers un nœud placé à gauche ferait une boucle.
    const flip = from && to && to.x < from.x;
    const lit = focus !== null && focus.has(e.source) && focus.has(e.target);
    return {
      id: e.id,
      source: flip ? e.target : e.source,
      target: flip ? e.source : e.target,
      label: e.label,
      style: {
        ...EDGE_STYLE[e.style],
        opacity: focus && !lit ? 0.15 : 1,
        strokeWidth: lit ? 2.4 : EDGE_STYLE[e.style].strokeWidth,
      },
      labelStyle: { fontSize: 10.5, fontFamily: "var(--font-mono)", fill: "var(--muted-foreground)" },
      labelBgStyle: { fill: "var(--card)" },
      selectable: false,
    };
  }), [edges, byId, focus]);

  const selected = byId.get(selectedId) ?? byId.get("root")!;
  const selectedNeighbors = [...neighborsOf(selected.id)]
    .map((id) => byId.get(id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));

  function refresh() {
    onChanged();
    void mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="bg-card relative overflow-hidden rounded-xl border" data-demo="customer-graph">
          <div className="bg-muted/40 flex flex-wrap items-center gap-2 border-b px-3 py-2">
            <div role="group" aria-label="Couches affichées" className="flex flex-wrap gap-1.5">
              {LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  aria-pressed={shown[layer.id]}
                  onClick={() => setShown((s) => ({ ...s, [layer.id]: !s[layer.id] }))}
                  className={cn(
                    "bg-card inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs",
                    !shown[layer.id] && "text-muted-foreground line-through opacity-60",
                  )}
                >
                  <span className={cn("size-2 rounded-full", HUE[FAMILY_HUE[layer.family]].solid)} />
                  {layer.label}
                </button>
              ))}
            </div>
            {relationsError !== undefined && (
              <span className="text-danger ml-auto text-xs">Les relations n&apos;ont pas pu être lues.</span>
            )}
          </div>
          <div className="h-[520px] sm:h-[640px]">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={NODE_TYPES}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              // La carte est elle-même un bouton : le focus de xyflow ferait un
              // second arrêt de tabulation qui ne sélectionne rien.
              nodesFocusable={false}
              edgesFocusable={false}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onNodeMouseEnter={(_, node) => setHoveredId(node.id)}
              onNodeMouseLeave={() => setHoveredId(null)}
              fitView
              fitViewOptions={{ padding: 0.12 }}
              minZoom={0.2}
              maxZoom={1.6}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={40} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          <p className="text-muted-foreground pointer-events-none absolute bottom-2 left-3 text-[11px]">
            Molette pour zoomer · glisser pour se déplacer · cliquer un nœud pour sa fiche
          </p>
        </div>

        <GraphPanel
          node={selected}
          neighbors={selectedNeighbors}
          customer={customer}
          relations={relations ?? null}
          onSelect={setSelectedId}
          onChanged={refresh}
        />
      </div>

      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
      {(Object.keys(FAMILY_LABEL) as GraphFamily[]).map((family) => (
        <span key={family} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", HUE[FAMILY_HUE[family]].solid)} />
          {FAMILY_LABEL[family]}
        </span>
      ))}
      <span>Tirets bleus : « apporté par ». Point orange : un champ à renseigner.</span>
    </div>
  );
}
