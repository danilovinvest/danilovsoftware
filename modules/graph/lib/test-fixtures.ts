import type { CustomersGraph, GraphEdge, GraphNode } from "./types";

/** Une fiche de test : une particulière prospect, sans lien, sauf mention contraire. */
export function fiche(id: string, over: Partial<GraphNode> = {}): GraphNode {
  return {
    id,
    name: `Fiche ${id}`,
    reference: `CL-${id}`,
    kind: "particulier",
    relation: null,
    relation_effective: "client_final",
    status: "prospect",
    is_client: false,
    issuer: "",
    city: "Nice",
    projects_count: 0,
    is_referrer: false,
    archived: false,
    degree: 0,
    ...over,
  };
}

export function contact(a: string, b: string, via: string[], label = ""): GraphEdge {
  return {
    id: `shared_contact:${a}>${b}`,
    source: a,
    target: b,
    kind: "shared_contact",
    inferred: true,
    weight: via.length,
    label,
    via,
  };
}

export function link(a: string, b: string, kind: GraphEdge["kind"] = "link:syndic", weight = 1): GraphEdge {
  return { id: `${kind}:${a}>${b}`, source: a, target: b, kind, inferred: false, weight, label: "", via: [] };
}

/** Toutes les paires d'une clique : ce que le serveur rend pour un interlocuteur commun. */
export function clique(ids: string[], identifier: string, label: string): GraphEdge[] {
  const out: GraphEdge[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) out.push(contact(ids[i], ids[j], [identifier], label));
  }
  return out;
}

export function payload(nodes: GraphNode[], edges: GraphEdge[], version = "v1"): CustomersGraph {
  return { generated_at: "2026-09-29T10:00:00Z", version, nodes, edges };
}
