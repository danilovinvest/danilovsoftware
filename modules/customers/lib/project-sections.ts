/**
 * Les sections d'une affaire ouverte, et celle qui s'ouvre d'elle-même.
 *
 * L'affaire dépliée portait des onglets — Chronologie, Devis, Après-signature —
 * sous une frise, un bandeau et des notes : deux niveaux d'onglets empilés
 * (ceux de la fiche, puis ceux de l'affaire), et ce qui vivait dans un onglet
 * fermé ne se voyait pas du tout. Ce sont désormais des sections repliables,
 * lues de haut en bas, dont une seule s'ouvre d'office.
 *
 * Module pur : ni React ni réseau, testé à côté (`project-sections.test.ts`).
 */

import { jalonOrder, type Jalons } from "./jalons";
import { settlementOf, type SettlementQuote } from "./settlement";
import type { Metier } from "./cycle";
import type { ProjectMission } from "./types";

/** Dans l'ordre de l'écran. */
export const PROJECT_SECTIONS = ["devis", "apres", "chronologie", "notes"] as const;
export type ProjectSection = (typeof PROJECT_SECTIONS)[number];

/**
 * La section que désigne `?onglet=`. Les liens déjà partagés — la recherche
 * écrit `&onglet=devis`, le graphe aussi — gardent leur sens : chaque ancien
 * onglet a sa section. `chrono` est accepté comme `chronologie`.
 */
export function sectionFromParam(onglet: string | null | undefined): ProjectSection | null {
  if (!onglet) return null;
  if (onglet === "chrono") return "chronologie";
  return (PROJECT_SECTIONS as readonly string[]).includes(onglet)
    ? (onglet as ProjectSection)
    : null;
}

/**
 * La section ouverte d'office : là où il reste de l'argent à faire entrer, ou
 * sinon là où l'affaire avance.
 *
 * Tant qu'aucun devis n'est signé, ou qu'un règlement est attendu — acompte ou
 * solde —, c'est « Devis & règlements ». Signée et sans règlement en attente,
 * l'affaire se joue dans l'après-signature. La règle ne lit que les devis : la
 * pièce qui porte le règlement est celle de `settlementOf`, la même que la frise.
 */
export function defaultSection(quotes: readonly SettlementQuote[]): ProjectSection {
  const signee = quotes.some((quote) => quote.status === "accepte" || quote.status === "realise");
  if (!signee) return "devis";
  const { deposit, balance } = settlementOf([...quotes]);
  return deposit === "en_attente" || balance === "en_attente" ? "devis" : "apres";
}

/**
 * L'avancement de l'après-signature, « 3/7 » dans le titre de sa section.
 *
 * Les étapes facultatives — les corrections — ne comptent pas : elles ne
 * bloquent rien, et une affaire rendue sans correction serait sinon à « 6/7 »
 * pour toujours.
 */
export function jalonProgress(
  metier: Metier,
  mission: ProjectMission,
  jalons: Jalons,
): { done: number; total: number } {
  const requis = jalonOrder(metier, mission).filter((jalon) => !jalon.optional);
  return {
    done: requis.filter((jalon) => jalons[jalon.key] !== null).length,
    total: requis.length,
  };
}
