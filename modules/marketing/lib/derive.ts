import type {
  CityCoverage,
  ReadRealisation,
  Realisation,
} from "./types";

/**
 * Ce qui se déduit d'une réalisation, et rien de plus.
 *
 * Module **pur**, sur le patron de `cycle.ts` et de `worksites/derive.ts` : ni
 * React, ni réseau. Il ne calcule que ce que les données portent — la
 * complétude d'un article et la couverture par ville.
 *
 * Ce qui a disparu avec le jeu de démonstration : la durée du chantier (aucune
 * affaire ne porte de date de fin), l'avis client demandé (le CRM ne suit pas
 * les demandes d'avis), les photos (elles vivent dans le dossier OneDrive, où
 * l'entreprise les range déjà — en tenir un second exemplaire ici serait faux
 * dès la première prise de vue).
 */

/**
 * Ce qu'il faut pour publier.
 *
 * Cinq exigences, pas plus : un article n'est pas un formulaire à remplir.
 * L'ordre est celui de la rédaction, et c'est celui dans lequel l'écran les
 * réclame.
 */
const CHECKS: Array<{ key: string; label: string; ok: (r: Realisation) => boolean }> = [
  { key: "title", label: "Titre", ok: (r) => r.article.title.trim() !== "" },
  { key: "slug", label: "Adresse de la page", ok: (r) => r.article.slug.trim() !== "" },
  { key: "excerpt", label: "Chapô", ok: (r) => r.article.excerpt.trim() !== "" },
  {
    key: "corps",
    label: "Contexte, solution, résultat",
    ok: (r) =>
      r.article.context.trim() !== "" &&
      r.article.solution.trim() !== "" &&
      r.article.result.trim() !== "",
  },
  {
    key: "keywords",
    label: "Mots-clés",
    ok: (r) => r.article.keywords.length > 0,
  },
];

export function read(realisation: Realisation): ReadRealisation {
  const missing = CHECKS.filter((c) => !c.ok(realisation)).map((c) => c.label);
  return {
    realisation,
    completeness: Math.round(((CHECKS.length - missing.length) / CHECKS.length) * 100),
    missing,
  };
}

/**
 * La couverture par ville.
 *
 * Le référencement local est le nerf de la guerre pour un bureau d'études :
 * une ville couverte par un article publié, c'est une requête gagnée. Les
 * affaires sans ville n'y figurent pas — elles ne couvrent rien.
 */
export function coverage(reads: ReadRealisation[]): CityCoverage[] {
  const par = new Map<string, CityCoverage>();
  for (const { realisation } of reads) {
    const ville = realisation.city.trim();
    if (ville === "") continue;
    const ligne = par.get(ville) ?? { city: ville, published: 0, total: 0 };
    ligne.total += 1;
    if (realisation.article.status === "publie") ligne.published += 1;
    par.set(ville, ligne);
  }
  return [...par.values()].sort(
    (a, b) => b.total - a.total || a.city.localeCompare(b.city),
  );
}

/** Un titre proposé, jamais imposé : le nom du chantier et sa ville. */
export function suggestTitle(realisation: Realisation): string {
  return realisation.city
    ? `${realisation.label} — ${realisation.city}`
    : realisation.label;
}

/**
 * L'adresse d'une page, dérivée du titre.
 *
 * Sans accents ni ponctuation : une URL qui en porte se recopie mal et se
 * partage encore plus mal.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}
