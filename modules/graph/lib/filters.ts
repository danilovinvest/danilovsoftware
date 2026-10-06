import { CATEGORY_ORDER, type GraphCategory } from "./categories";
import { EDGE_FAMILY_ORDER, type EdgeFamily, type GraphModel, type ModelEdge, type ModelNode } from "./model";
import { recordOf } from "./records";

/**
 * Ce que la toile montre, parmi tout ce que le modèle porte.
 *
 * **Les fiches sans lien sont masquées par défaut**, et c'est ce qui rend la
 * toile lisible : la plupart des fiches n'ont aucun voisin, et les dessiner
 * toutes noierait quelques constellations dans un nuage de points. Elles restent à un clic, comptées (« Afficher les fiches
 * sans lien (N) »). **Les archivées aussi** : une fiche rangée n'a rien à dire
 * d'une relation vivante — sauf si on la demande.
 *
 * Un interlocuteur commun n'est montré que s'il relie encore au moins deux
 * fiches visibles : une étoile à une branche ne relie rien.
 */
export type CompanyFilter = "tous" | "ompt-structure" | "ompt-groupe";

export type GraphFilters = {
  categories: Record<GraphCategory, boolean>;
  families: Record<EdgeFamily, boolean>;
  showIsolated: boolean;
  hideArchived: boolean;
  company: CompanyFilter;
};

export const DEFAULT_FILTERS: GraphFilters = {
  categories: recordOf(CATEGORY_ORDER, () => true),
  families: recordOf(EDGE_FAMILY_ORDER, () => true),
  showIsolated: false,
  hideArchived: true,
  company: "tous",
};

export type VisibleGraph = {
  nodes: ModelNode[];
  edges: ModelEdge[];
  /** Les fiches retenues qui n'ont aucun trait visible — montrées ou non. */
  isolatedCount: number;
};

/**
 * La société d'une fiche contre celle qu'on demande. Une fiche mixte ou sans
 * pièce reste des deux côtés — c'est la règle du périmètre dans tout le CRM.
 */
function inCompany(node: ModelNode, company: CompanyFilter): boolean {
  if (company === "tous" || !node.fiche) return true;
  const issuer = node.fiche.issuer;
  return issuer === company || issuer === "mixte" || issuer === "";
}

/** Une fiche que les filtres de catégorie, d'archive et de société retiennent. */
export function ficheRetained(node: ModelNode, filters: GraphFilters): boolean {
  if (!node.fiche) return false;
  if (filters.hideArchived && node.archived) return false;
  return filters.categories[node.category] && inCompany(node, filters.company);
}

/**
 * `pinned` : le nœud qu'on regarde reste affiché quels que soient les filtres.
 * Chercher une fiche isolée ou archivée, ou arriver par `?focus=` depuis sa
 * fiche, doit la montrer — pas répondre par une toile où elle n'est pas.
 */
export function visibleSubgraph(model: GraphModel, filters: GraphFilters, pinned: string | null = null): VisibleGraph {
  const retained = new Set(
    model.nodes.filter((node) => ficheRetained(node, filters) || (node.fiche && node.id === pinned)).map((n) => n.id),
  );
  const hubsOn = (filters.categories.interlocuteur && filters.families.shared_contact) || pinned?.startsWith("hub:");

  // Les rayons d'une étoile n'existent que vers une fiche retenue.
  const spokes = new Map<string, number>();
  const candidates = model.edges.filter((edge) => {
    if (!filters.families[edge.family]) return false;
    if (edge.kind === "contact_hub") {
      if (!hubsOn || !retained.has(edge.target)) return false;
      spokes.set(edge.source, (spokes.get(edge.source) ?? 0) + 1);
      return true;
    }
    return retained.has(edge.source) && retained.has(edge.target);
  });
  const hubs = new Set([...spokes].filter(([id, count]) => count >= 2 || id === pinned).map(([id]) => id));
  const edges = candidates.filter((edge) => edge.kind !== "contact_hub" || hubs.has(edge.source));

  const touched = new Set<string>();
  for (const edge of edges) {
    touched.add(edge.source);
    touched.add(edge.target);
  }
  let isolatedCount = 0;
  const nodes = model.nodes.filter((node) => {
    if (node.hub) return hubs.has(node.id);
    if (!retained.has(node.id)) return false;
    if (touched.has(node.id)) return true;
    isolatedCount++;
    if (node.id === pinned) return true;
    return filters.showIsolated;
  });
  return { nodes, edges, isolatedCount };
}

/** Le nombre de fiches par catégorie, sous les filtres d'archive et de société. */
export function countByCategory(model: GraphModel, filters: GraphFilters): Record<GraphCategory, number> {
  const counts = recordOf(CATEGORY_ORDER, () => 0);
  for (const node of model.nodes) {
    if (node.hub) counts.interlocuteur++;
    else if (!(filters.hideArchived && node.archived) && inCompany(node, filters.company)) counts[node.category]++;
  }
  return counts;
}

/** Le nombre de traits par famille, tous filtres levés. */
export function countByFamily(model: GraphModel): Record<EdgeFamily, number> {
  const counts = recordOf(EDGE_FAMILY_ORDER, () => 0);
  for (const edge of model.edges) counts[edge.family]++;
  return counts;
}
