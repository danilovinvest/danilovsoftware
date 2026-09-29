import { categoryOfNode, type GraphCategory } from "./categories";
import { groupSharedContacts, HUB_MIN, type ContactHub } from "./hubs";
import type { CustomersGraph, GraphEdge, GraphEdgeKind, GraphNode } from "./types";

/**
 * Ce que la toile dessine, tiré de ce que sert l'API.
 *
 * Module pur : ni DOM ni Sigma. Il décide des nœuds (fiches et interlocuteurs
 * communs), des traits, de leurs familles et de leurs tailles ; la toile ne
 * fait que les poser. Les couleurs n'y sont pas — elles dépendent du thème, et
 * la toile les applique au dessin (`nodeReducer`), si bien qu'un changement de
 * thème ne reconstruit rien.
 */

/** Les familles de traits, telles que les filtres les proposent. */
export type EdgeFamily = "link" | "referred_project" | "referred_customer" | "shared_contact" | "shared_domain";

export const EDGE_FAMILY_ORDER: EdgeFamily[] = [
  "link",
  "referred_project",
  "referred_customer",
  "shared_contact",
  "shared_domain",
];

export const EDGE_FAMILY_META: Record<EdgeFamily, { label: string; inferred: boolean }> = {
  link: { label: "Liens posés (syndic, architecte, payeur)", inferred: false },
  referred_project: { label: "Affaires apportées", inferred: false },
  referred_customer: { label: "Fiches recommandées", inferred: false },
  shared_contact: { label: "Interlocuteurs communs", inferred: true },
  shared_domain: { label: "Domaines professionnels communs", inferred: true },
};

export function familyOf(kind: GraphEdgeKind): EdgeFamily {
  switch (kind) {
    case "link:syndic":
    case "link:architecte":
    case "link:payeur":
      return "link";
    default:
      return kind;
  }
}

export type ModelNode = {
  id: string;
  label: string;
  category: GraphCategory;
  size: number;
  archived: boolean;
  /** Nom et référence sans accents, en minuscules : la recherche ne recalcule rien. */
  search: string;
  /** La fiche, absente pour un interlocuteur commun. */
  fiche: GraphNode | null;
  hub: ContactHub | null;
};

export type ModelEdge = {
  id: string;
  source: string;
  target: string;
  /** Le genre du lien — `contact_hub` pour un rayon d'étoile. */
  kind: GraphEdgeKind | "contact_hub";
  family: EdgeFamily;
  inferred: boolean;
  /** Un lien posé a un sens (A a pour syndic B) ; un lien déduit n'en a pas. */
  directed: boolean;
  weight: number;
  label: string;
  size: number;
};

export type GraphModel = {
  nodes: ModelNode[];
  edges: ModelEdge[];
  byId: Map<string, ModelNode>;
};

/** La taille d'une fiche : racine carrée du nombre de connexions, bornée. */
export function ficheSize(degree: number): number {
  return Math.min(24, 3.5 + 2.4 * Math.sqrt(Math.max(0, degree)));
}

function hubSize(fiches: number): number {
  return Math.min(12, 2.5 + 1.3 * Math.sqrt(fiches));
}

function edgeSize(edge: Pick<ModelEdge, "inferred" | "weight">): number {
  if (edge.inferred) return 0.6;
  return 1 + 0.6 * Math.min(3, Math.sqrt(edge.weight));
}

export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function buildModel(graph: CustomersGraph, hubMin: number = HUB_MIN): GraphModel {
  const fiches: ModelNode[] = graph.nodes.map((node) => ({
    id: node.id,
    label: node.name,
    category: categoryOfNode(node),
    size: ficheSize(node.degree),
    archived: node.archived,
    search: normalizeSearch(`${node.name} ${node.reference} ${node.city}`),
    fiche: node,
    hub: null,
  }));
  const known = new Set(fiches.map((node) => node.id));
  const { hubs, pairEdges } = groupSharedContacts(graph.edges, hubMin);

  const hubNodes: ModelNode[] = hubs.map((hub) => ({
    id: hub.id,
    label: hub.label,
    category: "interlocuteur",
    size: hubSize(hub.fiches.length),
    archived: false,
    search: normalizeSearch(`${hub.label} ${hub.identifiers.join(" ")}`),
    fiche: null,
    hub,
  }));

  const kept = graph.edges.filter((edge) => edge.kind !== "shared_contact").concat(pairEdges);
  const edges = kept
    .filter((edge) => known.has(edge.source) && known.has(edge.target))
    .map(toModelEdge)
    .concat(hubs.flatMap(hubEdges).filter((edge) => known.has(edge.target)));

  const nodes = fiches.concat(hubNodes);
  return { nodes, edges, byId: new Map(nodes.map((node) => [node.id, node])) };
}

function toModelEdge(edge: GraphEdge): ModelEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    kind: edge.kind,
    family: familyOf(edge.kind),
    inferred: edge.inferred,
    directed: !edge.inferred,
    weight: edge.weight,
    label: edge.label,
    size: edgeSize(edge),
  };
}

function hubEdges(hub: ContactHub): ModelEdge[] {
  return hub.fiches.map((fiche) => ({
    id: `${hub.id}>${fiche}`,
    source: hub.id,
    target: fiche,
    kind: "contact_hub" as const,
    family: "shared_contact" as const,
    inferred: true,
    directed: false,
    weight: 1,
    label: hub.label,
    size: edgeSize({ inferred: true, weight: 1 }),
  }));
}
