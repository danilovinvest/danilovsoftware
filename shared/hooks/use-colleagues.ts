"use client";

import { STABLE, useCached } from "../api/cache";
import { listColleagues, type Colleague } from "../api/directory";

/** Une seule liste vide : une nouvelle à chaque rendu relancerait les effets qui en dépendent. */
const NONE: Colleague[] = [];

/**
 * L'annuaire, chargé une fois pour toute l'application.
 *
 * Il partait à chaque composant qui en avait besoin — trois fois par fiche. Il
 * vit désormais dans le cache partagé : le premier qui le demande le charge,
 * les autres le lisent.
 *
 * Une liste vide en cas d'échec, et non une erreur remontée : ne pas pouvoir
 * proposer de collègue n'empêche pas d'enregistrer ce qu'on était en train
 * d'écrire.
 */
export function useColleagues(): Colleague[] {
  const { data, error } = useCached("directory:users", () => listColleagues(), STABLE);
  return error || !data ? NONE : data.items;
}
