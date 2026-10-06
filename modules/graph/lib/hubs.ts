import type { GraphEdge } from "./types";

/**
 * Les interlocuteurs communs, regroupés en étoiles.
 *
 * Le serveur rend `shared_contact` **par paire** : un interlocuteur présent sur
 * quatorze fiches sous le même numéro fait quatre-vingt-onze traits, une clique
 * qui noie tout ce qu'elle touche et ne dit qu'une chose — une personne. On la
 * dessine donc comme une personne : un petit nœud « interlocuteur » relié à
 * chacune de ses fiches, quatorze traits au lieu de quatre-vingt-onze.
 *
 * Le regroupement part de `via`, l'identifiant partagé (adresse ou numéro).
 * Deux identifiants qui touchent **exactement** les mêmes fiches sont la même
 * personne vue deux fois — son adresse et son numéro — et ne font qu'une
 * étoile. On ne fusionne jamais sur un simple recouvrement : deux personnes
 * communes à la même paire de fiches resteraient sinon confondues.
 *
 * En deçà de `HUB_MIN` fiches, pas d'étoile : entre deux fiches, un trait dit
 * tout, et un nœud de plus au milieu ne ferait qu'allonger le chemin.
 */
export const HUB_MIN = 3;

export type ContactHub = {
  /** `hub:<premier identifiant>` — stable d'un chargement à l'autre. */
  id: string;
  /** Les noms connus de la personne, ou à défaut son identifiant. */
  label: string;
  identifiers: string[];
  /** Les fiches qui la partagent, triées. */
  fiches: string[];
};

export type HubGrouping = {
  hubs: ContactHub[];
  /** Les liens `shared_contact` qu'aucune étoile ne dit à leur place. */
  pairEdges: GraphEdge[];
};

export function groupSharedContacts(edges: GraphEdge[], hubMin: number = HUB_MIN): HubGrouping {
  const contactEdges = edges.filter((edge) => edge.kind === "shared_contact");
  const fichesOf = new Map<string, Set<string>>();
  for (const edge of contactEdges) {
    for (const identifier of edge.via) {
      const set = fichesOf.get(identifier) ?? new Set<string>();
      set.add(edge.source);
      set.add(edge.target);
      fichesOf.set(identifier, set);
    }
  }

  // Même ensemble de fiches, même personne : la clé est l'ensemble trié.
  const groups = new Map<string, { identifiers: string[]; fiches: string[] }>();
  for (const [identifier, set] of fichesOf) {
    if (set.size < hubMin) continue;
    const fiches = [...set].sort();
    const key = fiches.join("|");
    const group = groups.get(key) ?? { identifiers: [], fiches };
    group.identifiers.push(identifier);
    groups.set(key, group);
  }

  const names = namesByIdentifier(contactEdges);
  const hubbed = new Set<string>();
  const hubs = [...groups.values()].map((group) => {
    const identifiers = [...group.identifiers].sort();
    identifiers.forEach((identifier) => hubbed.add(identifier));
    const known = new Set(identifiers.flatMap((identifier) => names.get(identifier) ?? []));
    return {
      id: `hub:${identifiers[0]}`,
      label: known.size > 0 ? [...known].sort().join(", ") : identifiers[0],
      identifiers,
      fiches: group.fiches,
    };
  });
  hubs.sort((a, b) => a.id.localeCompare(b.id));

  // Une paire reste tracée si l'un de ses identifiants n'appartient à aucune
  // étoile : c'est une seconde personne commune, que l'étoile ne dit pas.
  const pairEdges = contactEdges.filter((edge) => edge.via.some((identifier) => !hubbed.has(identifier)));
  return { hubs, pairEdges };
}

/**
 * Les noms d'un identifiant, lus sur les liens.
 *
 * Le libellé d'un lien juxtapose les noms de chaque identifiant partagé
 * (« Dupont · Martin »). Il n'est sûr que lorsque le lien n'a qu'un
 * identifiant, ou quand il a autant de morceaux que d'identifiants ; ailleurs,
 * on ne devine pas — l'étoile prendra l'identifiant lui-même.
 */
function namesByIdentifier(edges: GraphEdge[]): Map<string, string[]> {
  const out = new Map<string, Set<string>>();
  const add = (identifier: string, piece: string) => {
    for (const name of piece.split(",").map((part) => part.trim())) {
      if (name === "" || name === identifier) continue;
      const set = out.get(identifier) ?? new Set<string>();
      set.add(name);
      out.set(identifier, set);
    }
  };
  for (const edge of edges) {
    if (edge.label === "") continue;
    const pieces = edge.label.split(" · ");
    if (edge.via.length === 1) add(edge.via[0], edge.label);
    else if (pieces.length === edge.via.length) edge.via.forEach((identifier, i) => add(identifier, pieces[i]));
  }
  return new Map([...out].map(([identifier, set]) => [identifier, [...set]]));
}
