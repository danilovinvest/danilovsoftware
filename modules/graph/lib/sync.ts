import Graph from "graphology";
import type { GraphCategory } from "./categories";
import type { VisibleGraph } from "./filters";
import type { EdgeFamily, ModelEdge, ModelNode } from "./model";

/**
 * Le graphe Graphology que Sigma dessine, tenu à jour **par différence**.
 *
 * Reconstruire le graphe à chaque relecture ferait sauter la toile : chaque
 * nœud repartirait d'une position neuve, et ce qu'on regardait serait
 * ailleurs. On ajoute donc ce qui manque, on retire ce qui a disparu, on met à
 * jour le reste **sans toucher à sa position**. Un nœud qui revient — un filtre
 * qu'on rallume — reprend la place qu'il avait (`memory`) ; un nœud neuf naît
 * au milieu de ses voisins déjà placés, et seulement à défaut sur une spirale
 * autour de la toile.
 *
 * Module sans DOM : Graphology tourne sous `bun test`.
 */
export type NodeAttrs = {
  x: number;
  y: number;
  size: number;
  label: string;
  category: GraphCategory;
  archived: boolean;
  hub: boolean;
};

export type EdgeAttrs = {
  size: number;
  /** Le programme Sigma : une flèche pour un lien posé, un trait sinon. */
  type: "arrow" | "line";
  family: EdgeFamily;
  inferred: boolean;
  weight: number;
};

export type CanvasGraph = Graph<NodeAttrs, EdgeAttrs>;
export type Point = { x: number; y: number };

export function createCanvasGraph(): CanvasGraph {
  return new Graph<NodeAttrs, EdgeAttrs>({ multi: true, type: "mixed", allowSelfLoops: false });
}

/** Un nombre de [0, 1[ tiré de l'identifiant : la même fiche, la même graine. */
export function hashUnit(id: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function nodeAttrs(node: ModelNode, at: Point): NodeAttrs {
  return {
    x: at.x,
    y: at.y,
    size: node.size,
    label: node.label,
    category: node.category,
    archived: node.archived,
    hub: node.hub !== null,
  };
}

function edgeAttrs(edge: ModelEdge): EdgeAttrs {
  return {
    size: edge.size,
    type: edge.directed ? "arrow" : "line",
    family: edge.family,
    inferred: edge.inferred,
    weight: edge.weight,
  };
}

function extent(graph: CanvasGraph): { center: Point; radius: number } {
  if (graph.order === 0) return { center: { x: 0, y: 0 }, radius: 10 };
  let sx = 0;
  let sy = 0;
  graph.forEachNode((_, a) => {
    sx += a.x;
    sy += a.y;
  });
  const center = { x: sx / graph.order, y: sy / graph.order };
  let radius = 0;
  graph.forEachNode((_, a) => {
    radius = Math.max(radius, Math.hypot(a.x - center.x, a.y - center.y));
  });
  return { center, radius: Math.max(radius, 10) };
}

/**
 * La place d'un nœud neuf : la moyenne de ses voisins placés, légèrement
 * décalée (la graine), ou à défaut un point de la spirale extérieure.
 */
export function placeNode(id: string, neighbours: Point[], frame: { center: Point; radius: number }, rank: number): Point {
  const angle = hashUnit(id, 1) * Math.PI * 2;
  if (neighbours.length > 0) {
    const mx = neighbours.reduce((s, p) => s + p.x, 0) / neighbours.length;
    const my = neighbours.reduce((s, p) => s + p.y, 0) / neighbours.length;
    const jitter = frame.radius * 0.04 * (0.5 + hashUnit(id, 2));
    return { x: mx + Math.cos(angle) * jitter, y: my + Math.sin(angle) * jitter };
  }
  // Angle d'or : des points qui ne se superposent jamais, rang après rang.
  const golden = rank * 2.399963;
  const r = frame.radius * (1.1 + 0.02 * Math.sqrt(rank));
  return { x: frame.center.x + Math.cos(golden) * r, y: frame.center.y + Math.sin(golden) * r };
}

export type SyncResult = { added: string[]; removed: number };

export function syncGraph(graph: CanvasGraph, visible: VisibleGraph, memory: Map<string, Point>): SyncResult {
  const wanted = new Set(visible.nodes.map((node) => node.id));
  const wantedEdges = new Set(visible.edges.map((edge) => edge.id));
  let removed = 0;

  // On ne retire rien pendant un parcours : on relève d'abord, on retire ensuite.
  graph.edges().filter((key) => !wantedEdges.has(key)).forEach((key) => graph.dropEdge(key));
  for (const key of graph.nodes().filter((id) => !wanted.has(id))) {
    const { x, y } = graph.getNodeAttributes(key);
    memory.set(key, { x, y });
    graph.dropNode(key);
    removed++;
  }

  const frame = extent(graph);
  const pending = visible.nodes.filter((node) => !graph.hasNode(node.id));
  const added = placeAll(graph, pending, visible.edges, memory, frame);
  const fresh = new Set(added);

  for (const node of visible.nodes) {
    if (!fresh.has(node.id)) {
      const { x, y } = graph.getNodeAttributes(node.id);
      graph.replaceNodeAttributes(node.id, nodeAttrs(node, { x, y }));
    }
  }
  for (const edge of visible.edges) {
    if (graph.hasEdge(edge.id)) graph.replaceEdgeAttributes(edge.id, edgeAttrs(edge));
    else if (edge.directed) graph.addDirectedEdgeWithKey(edge.id, edge.source, edge.target, edgeAttrs(edge));
    else graph.addUndirectedEdgeWithKey(edge.id, edge.source, edge.target, edgeAttrs(edge));
  }
  return { added, removed };
}

/** Une place de départ sur un disque, pour une toile vide que ForceAtlas2 va ordonner. */
export function seedPoint(id: string, count: number): Point {
  const radius = 10 * Math.sqrt(Math.max(1, count));
  const angle = hashUnit(id, 3) * Math.PI * 2;
  const r = radius * Math.sqrt(hashUnit(id, 4));
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

function adjacencyOf(edges: ModelEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    const list = adjacency.get(a);
    if (list) list.push(b);
    else adjacency.set(a, [b]);
  };
  for (const edge of edges) {
    link(edge.source, edge.target);
    link(edge.target, edge.source);
  }
  return adjacency;
}

/**
 * Pose les nœuds neufs : d'abord ceux qu'on a déjà vus (leur place d'avant),
 * puis ceux dont un voisin est placé, de proche en proche (parcours en
 * largeur). Un nœud sans aucun voisin placé ouvre sa propre grappe : sur une
 * toile vide, un point d'un disque tiré de son identifiant ; sinon un point de
 * la spirale extérieure. Linéaire en nœuds et en traits — cinq mille fiches ne
 * coûtent pas cinq mille passes.
 */
function placeAll(
  graph: CanvasGraph,
  pending: ModelNode[],
  edges: ModelEdge[],
  memory: Map<string, Point>,
  frame: { center: Point; radius: number },
): string[] {
  const fresh = graph.order === 0;
  const adjacency = adjacencyOf(edges);
  const byId = new Map(pending.map((node) => [node.id, node]));
  const added: string[] = [];
  const put = (node: ModelNode, at: Point) => {
    graph.addNode(node.id, nodeAttrs(node, at));
    added.push(node.id);
  };
  const around = (id: string) =>
    (adjacency.get(id) ?? []).filter((other) => graph.hasNode(other)).map((other) => graph.getNodeAttributes(other));
  // Le parcours en largeur, depuis les nœuds posés qu'on lui confie.
  const spread = (queue: string[]) => {
    for (let i = 0; i < queue.length; i++) {
      for (const other of adjacency.get(queue[i]) ?? []) {
        const node = byId.get(other);
        if (!node || graph.hasNode(other)) continue;
        put(node, placeNode(other, around(other), frame, 0));
        queue.push(other);
      }
    }
  };

  pending.forEach((node) => {
    const known = memory.get(node.id);
    if (known) put(node, known);
  });
  spread([...added, ...graph.nodes().filter((id) => !byId.has(id))]);
  let rank = 0;
  for (const node of pending) {
    if (graph.hasNode(node.id)) continue;
    const near = around(node.id);
    if (near.length > 0) put(node, placeNode(node.id, near, frame, 0));
    else put(node, fresh ? seedPoint(node.id, pending.length) : placeNode(node.id, [], frame, rank++));
    spread([node.id]);
  }
  return added;
}
