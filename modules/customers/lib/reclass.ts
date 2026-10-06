import { relationOf } from "./classification";
import type { CustomerKind, CustomerRelation } from "./types";

/**
 * Reclasser une fiche depuis la liste : son type et sa relation, rien d'autre.
 *
 * Deux routes, parce que les deux axes n'ont pas la même : le type vit dans le
 * formulaire de la fiche (`PATCH`, lu par-dessus la ligne courante), la
 * relation dans le classement (`PUT …/classification`, qui garde le SIRET et le
 * syndic qu'on ne lui envoie pas). Ce module dit lesquelles appeler — aucune
 * quand rien ne change — et ce que la relation vide voudra dire une fois le
 * type posé, pour que l'écran l'annonce avant le clic.
 *
 * Pur et testé : c'est la seule décision de l'écran.
 */
export type ReclassState = { kind: CustomerKind; relation: CustomerRelation | null };

export type ReclassPlan = {
  kind: CustomerKind | null;
  /** `undefined` : la relation ne change pas ; `null` : la déduire du type. */
  relation: CustomerRelation | null | undefined;
  /** La relation qui s'appliquera, choisie ou déduite. */
  effective: CustomerRelation;
};

export function reclassPlan(current: ReclassState, next: ReclassState): ReclassPlan {
  return {
    kind: next.kind !== current.kind ? next.kind : null,
    relation: next.relation !== current.relation ? next.relation : undefined,
    effective: relationOf(next).value,
  };
}

/** Rien à écrire : le bouton reste grisé. */
export function isNoop(plan: ReclassPlan): boolean {
  return plan.kind === null && plan.relation === undefined;
}
