import type { GraphModel, ModelEdge, ModelNode } from "./model";

/**
 * Les voisins d'un nœud, rangés par nature du lien, dits en phrases.
 *
 * Un lien posé a un sens et le panneau le dit dans les deux : « A pour
 * syndic » vu de la copropriété, « Gère » vu du syndic. Un lien déduit n'en a
 * pas : il dit ce qui est partagé. Le panneau lit **tout** le modèle et non la
 * seule toile — un filtre masque un trait, il ne fait pas disparaître le fait.
 */
export type NeighbourGroup = {
  key: string;
  title: string;
  inferred: boolean;
  items: Array<{ node: ModelNode; detail: string }>;
};

const ROLE: Record<string, [outgoing: string, incoming: string]> = {
  "link:syndic": ["A pour syndic", "Gère"],
  "link:architecte": ["A pour architecte", "Architecte de"],
  "link:payeur": ["Payé par", "Paie pour"],
  referred_project: ["A apporté des affaires à", "Affaires apportées par"],
  referred_customer: ["A recommandé", "Recommandé par"],
};

function describe(edge: ModelEdge, outgoing: boolean): { key: string; title: string; detail: string } {
  const role = ROLE[edge.kind];
  if (role) {
    const detail = edge.kind === "referred_project" ? `${edge.weight} affaire${edge.weight > 1 ? "s" : ""}` : "";
    return { key: `${edge.kind}:${outgoing ? "out" : "in"}`, title: role[outgoing ? 0 : 1], detail };
  }
  switch (edge.kind) {
    case "contact_hub":
      return { key: "contact_hub", title: outgoing ? "Présent sur les fiches" : "Interlocuteurs communs", detail: "" };
    case "shared_contact":
      return { key: "shared_contact", title: "Partagent un interlocuteur", detail: edge.label };
    default:
      return { key: "shared_domain", title: "Même domaine professionnel", detail: edge.label };
  }
}

export function neighbourGroups(model: GraphModel, id: string): NeighbourGroup[] {
  const groups = new Map<string, NeighbourGroup>();
  for (const edge of model.edges) {
    const outgoing = edge.source === id;
    if (!outgoing && edge.target !== id) continue;
    const other = model.byId.get(outgoing ? edge.target : edge.source);
    if (!other) continue;
    const { key, title, detail } = describe(edge, outgoing);
    const group = groups.get(key) ?? { key, title, inferred: edge.inferred, items: [] };
    group.items.push({ node: other, detail });
    groups.set(key, group);
  }
  const out = [...groups.values()];
  for (const group of out) group.items.sort((a, b) => a.node.label.localeCompare(b.node.label));
  // Les liens posés d'abord : ce sont ceux qu'un humain a écrits.
  return out.sort((a, b) => Number(a.inferred) - Number(b.inferred) || a.title.localeCompare(b.title));
}
