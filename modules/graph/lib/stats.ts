import type { VisibleGraph } from "./filters";
import { normalizeSearch, type ModelNode } from "./model";

/**
 * Les chiffres de la barre du haut, et la recherche.
 *
 * Tout est compté sur **ce qui est affiché** : un chiffre qui ne correspond pas
 * à la toile qu'on regarde fait douter de la toile. Le nombre de connexions
 * d'une fiche, lui, reste celui du serveur (`degree`) — c'est une propriété de
 * la fiche, pas du filtre qu'on vient de poser.
 */
export type GraphStats = {
  fiches: number;
  interlocuteurs: number;
  edges: number;
  /** Les groupes de fiches reliées entre elles, d'au moins deux nœuds. */
  components: number;
  /** La taille du plus grand groupe, en nœuds. */
  largest: number;
  top: ModelNode[];
};

export function graphStats(visible: VisibleGraph, topN = 5): GraphStats {
  const parent = new Map<string, string>(visible.nodes.map((node) => [node.id, node.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) ?? root;
    // Compression du chemin : les appels suivants tombent en un saut.
    let cursor = id;
    while (cursor !== root) {
      const next = parent.get(cursor) ?? root;
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  };
  for (const edge of visible.edges) {
    if (!parent.has(edge.source) || !parent.has(edge.target)) continue;
    const a = find(edge.source);
    const b = find(edge.target);
    if (a !== b) parent.set(a, b);
  }
  const sizes = new Map<string, number>();
  for (const node of visible.nodes) {
    const root = find(node.id);
    sizes.set(root, (sizes.get(root) ?? 0) + 1);
  }
  const groups = [...sizes.values()].filter((size) => size >= 2);

  const fiches = visible.nodes.filter((node) => node.fiche);
  const top = [...fiches]
    .filter((node) => (node.fiche?.degree ?? 0) > 0)
    .sort((a, b) => (b.fiche?.degree ?? 0) - (a.fiche?.degree ?? 0) || a.label.localeCompare(b.label))
    .slice(0, topN);

  return {
    fiches: fiches.length,
    interlocuteurs: visible.nodes.length - fiches.length,
    edges: visible.edges.length,
    components: groups.length,
    largest: groups.length > 0 ? Math.max(...groups) : 0,
    top,
  };
}

/**
 * La recherche de la toile : le nom, la référence, la ville, et pour un
 * interlocuteur son adresse ou son numéro.
 *
 * Classement : le début du texte, puis le début d'un mot, puis n'importe où,
 * puis les lettres dans l'ordre (« dlmso » trouve « Dalmasso »). Sans accents
 * ni casse — on tape vite, au téléphone.
 */
export function searchNodes(nodes: ModelNode[], query: string, limit = 8): ModelNode[] {
  const q = normalizeSearch(query);
  if (q.length < 2) return [];
  const scored: Array<{ node: ModelNode; score: number }> = [];
  for (const node of nodes) {
    const score = matchScore(node.search, q);
    if (score > 0) scored.push({ node, score });
  }
  scored.sort(
    (a, b) =>
      b.score - a.score || (b.node.fiche?.degree ?? 0) - (a.node.fiche?.degree ?? 0) || a.node.label.localeCompare(b.node.label),
  );
  return scored.slice(0, limit).map((entry) => entry.node);
}

function matchScore(text: string, q: string): number {
  if (text.startsWith(q)) return 4;
  const at = text.indexOf(q);
  if (at > 0) return text[at - 1] === " " ? 3 : 2;
  return q.length >= 3 && isSubsequence(text, q) ? 1 : 0;
}

function isSubsequence(text: string, q: string): boolean {
  let i = 0;
  for (const char of text) {
    if (char === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}
