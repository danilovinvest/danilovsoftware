"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CARDS, cardOf } from "../lib/cards";
import type { AutomationNode, Graph, NodeConfig, NodeType, RunStep } from "../lib/types";
import { AutomationCard, type CardData } from "./automation-card";
import { CardInspector } from "./card-inspector";

/**
 * La toile.
 *
 * React Flow s'occupe du déplacement, du zoom et du tracé des liens ; nous, de
 * ce que les cartes disent et de ce qu'elles valent. Écrire soi-même un éditeur
 * de graphe — panoramique, molette, courbes de Bézier, poignées — aurait fait
 * beaucoup de code pour un résultat moins bon, et c'est le seul endroit du CRM
 * où la dépendance se justifie.
 *
 * Le graphe du CRM et celui de React Flow ne sont pas les mêmes objets : le
 * nôtre est ce qu'on enregistre, le sien porte en plus tout un état d'affichage.
 * La conversion se fait ici, aux deux bouts, et nulle part ailleurs.
 */
const NODE_TYPES = { card: AutomationCard };

/* Le trait suit le thème. React Flow peint par défaut un gris fixe, qui
 * disparaît sur fond sombre — et une couleur littérale ici casserait la
 * propriété que le mode sombre ne redéfinit que l'échelle. */
const EDGE_STYLE = {
  animated: true,
  style: { stroke: "var(--muted-foreground)", strokeOpacity: 0.45, strokeWidth: 1.5 },
};

export function AutomationCanvas({
  graph,
  cron,
  timeZone,
  calendars,
  failures,
  onChange,
  onCron,
  onTimeZone,
}: {
  graph: Graph;
  cron: string;
  timeZone: string;
  calendars: Array<{ id: string; name: string }>;
  /** Ce sur quoi la dernière exécution a buté, par carte. */
  failures: Record<string, string>;
  onChange: (graph: Graph) => void;
  onCron: (value: string) => void;
  onTimeZone: (value: string) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    useMemo(() => toFlowNodes(graph, cron, timeZone, failures), []), // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    useMemo(() => toFlowEdges(graph), []), // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    graph.nodes[0]?.id ?? null,
  );

  /*
   * Toute modification repart vers le parent sous **notre** forme.
   *
   * On ne remonte pas les objets de React Flow : ils portent des largeurs
   * mesurées, des drapeaux de sélection et des champs internes qui n'ont rien
   * à faire en base et qui changeraient à chaque rendu, rendant impossible de
   * savoir si le graphe a vraiment bougé.
   */
  const publish = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      onChange({
        nodes: nextNodes.map((node) => {
          const data = node.data as unknown as CardData;
          return {
            id: node.id,
            type: data.kind,
            position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
            config: data.config,
          };
        }),
        edges: nextEdges.map((edge) => ({ from: edge.source, to: edge.target })),
      });
    },
    [onChange],
  );

  const patchConfig = useCallback(
    (id: string, config: NodeConfig) => {
      setNodes((current) => {
        const next = current.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, config } as unknown as Record<string, unknown> }
            : node,
        );
        publish(next, edges);
        return next;
      });
    },
    [edges, publish, setNodes],
  );

  const addCard = useCallback(
    (type: NodeType) => {
      const card = cardOf(type);
      const id = `${type}-${Math.random().toString(36).slice(2, 8)}`;
      // Posée à droite de la dernière, à hauteur constante : une carte qui
      // apparaîtrait au hasard obligerait à la chercher avant de la brancher.
      const x = nodes.reduce((max, node) => Math.max(max, node.position.x), 0) + 300;
      const created: Node = {
        id,
        type: "card",
        position: { x, y: 120 },
        data: { kind: type, config: { ...card.defaults }, cron, timeZone } as unknown as Record<string, unknown>,
      };
      const next = [...nodes, created];
      setNodes(next);
      publish(next, edges);
      setSelectedId(id);
    },
    [cron, edges, nodes, publish, setNodes, timeZone],
  );

  const removeCard = useCallback(
    (id: string) => {
      const nextNodes = nodes.filter((node) => node.id !== id);
      const nextEdges = edges.filter((edge) => edge.source !== id && edge.target !== id);
      setNodes(nextNodes);
      setEdges(nextEdges);
      publish(nextNodes, nextEdges);
      setSelectedId(null);
    },
    [edges, nodes, publish, setEdges, setNodes],
  );

  const connect = useCallback(
    (connection: Connection) => {
      setEdges((current) => {
        const next = addEdge({ ...connection, ...EDGE_STYLE }, current);
        publish(nodes, next);
        return next;
      });
    },
    [nodes, publish, setEdges],
  );

  const selected = useMemo<AutomationNode | null>(() => {
    const node = nodes.find((item) => item.id === selectedId);
    if (!node) return null;
    const data = node.data as unknown as CardData;
    return { id: node.id, type: data.kind, position: node.position, config: data.config };
  }, [nodes, selectedId]);

  // Le déclencheur porte l'heure : la changer doit se voir sur la carte.
  const painted = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: { ...node.data, cron, timeZone, failure: failures[node.id] } as unknown as Record<
          string,
          unknown
        >,
      })),
    [nodes, cron, timeZone, failures],
  );

  return (
    <div className="flex min-h-0 flex-1 gap-3">
      <div className="bg-muted/20 relative min-w-0 flex-1 overflow-hidden rounded-xl border">
        <ReactFlow
          nodes={painted}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={connect}
          onNodeDragStop={() => publish(nodes, edges)}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          fitView
          // L'attribution reste : la retirer suppose une licence Pro, et le
          // module est là sous licence MIT.
          proOptions={{ hideAttribution: false }}
        >
          <Background gap={16} size={1} className="!bg-transparent" />
          <Controls showInteractive={false} className="!shadow-sm" />
        </ReactFlow>

        <div className="absolute top-3 left-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="bg-card shadow-sm">
                <PlusIcon />
                Ajouter une carte
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {CARDS.map((card) => {
                const Icon = card.icon;
                // Un seul déclencheur par graphe : en proposer un second
                // laisserait dessiner une automatisation que le serveur
                // refuserait d'activer.
                const already =
                  card.family === "declencheur" &&
                  nodes.some((node) => (node.data as unknown as CardData).kind === card.type);
                return (
                  <DropdownMenuItem
                    key={card.type}
                    disabled={already}
                    onSelect={() => addCard(card.type)}
                    className="items-start gap-2"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded",
                        card.tone.chip,
                      )}
                    >
                      <Icon className="size-3" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">{card.label}</span>
                      <span className="text-muted-foreground block text-[11px] leading-snug">
                        {already ? "Déjà sur la toile" : card.hint}
                      </span>
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardInspector
        node={selected}
        cron={cron}
        timeZone={timeZone}
        calendars={calendars}
        onConfig={(config) => selected && patchConfig(selected.id, config)}
        onCron={onCron}
        onTimeZone={onTimeZone}
        onDelete={() => selected && removeCard(selected.id)}
      />
    </div>
  );
}

function toFlowNodes(
  graph: Graph,
  cron: string,
  timeZone: string,
  failures: Record<string, string>,
): Node[] {
  return graph.nodes.map((node) => ({
    id: node.id,
    type: "card",
    position: node.position,
    data: {
      kind: node.type,
      config: node.config,
      cron,
      timeZone,
      failure: failures[node.id],
    } as unknown as Record<string, unknown>,
  }));
}

function toFlowEdges(graph: Graph): Edge[] {
  return graph.edges.map((edge) => ({
    id: `${edge.from}->${edge.to}`,
    source: edge.from,
    target: edge.to,
    ...EDGE_STYLE,
  }));
}

/** La carte sur laquelle la dernière exécution a buté, s'il y en a une. */
export function failuresOf(steps: RunStep[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const step of steps) {
    if (!step.ok) out[step.node] = step.detail;
  }
  return out;
}
