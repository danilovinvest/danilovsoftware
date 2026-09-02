import { DAY_END_HOUR, DAY_START_HOUR } from "./labels";

/**
 * Géométrie des grilles : convertir un point de l'écran en instant, et
 * inversement.
 *
 * Tout est en **minutes depuis minuit** plutôt qu'en `Date` : un glissement
 * traverse des colonnes de jours, et mêler la date au calcul obligerait à la
 * recomposer à chaque mouvement de souris. Le jour est un index de colonne,
 * l'heure un nombre de minutes ; les deux ne se rejoignent qu'au relâchement.
 */

/** Pas de la grille. Un rendez-vous tombe sur un quart d'heure, pas sur 14h07. */
export const STEP_MINUTES = 15;

/** Durée d'un créneau créé d'un simple clic, sans glissement. */
export const DEFAULT_MINUTES = 60;

export const SPAN_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;
export const DAY_START_MINUTES = DAY_START_HOUR * 60;
export const DAY_END_MINUTES = DAY_END_HOUR * 60;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function snap(minutes: number): number {
  return Math.round(minutes / STEP_MINUTES) * STEP_MINUTES;
}

/** Position verticale d'un instant, en pourcentage de la plage affichée. */
export function ratioOfMinutes(minutes: number): number {
  return ((minutes - DAY_START_MINUTES) / SPAN_MINUTES) * 100;
}

export function minutesOfDate(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Le point survolé, rapporté à la grille.
 *
 * `rect` est celui de la **première colonne de jour** : sa gauche donne
 * l'origine des colonnes, sa largeur leur pas, sa hauteur la plage horaire.
 * Mesurer la colonne plutôt que déduire une gouttière en pixels évite qu'un
 * changement de largeur dans le style ne décale silencieusement le calcul.
 */
export function pointToSlot(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): { day: number; minutes: number } {
  const day = clamp(Math.floor((clientX - rect.left) / rect.width), 0, 6);
  const ratio = clamp((clientY - rect.top) / rect.height, 0, 1);
  const minutes = clamp(
    snap(DAY_START_MINUTES + ratio * SPAN_MINUTES),
    DAY_START_MINUTES,
    DAY_END_MINUTES,
  );
  return { day, minutes };
}

/** Compose un instant à partir d'un jour et d'un nombre de minutes. */
export function at(day: Date, minutes: number): Date {
  const composed = new Date(day);
  composed.setHours(0, minutes, 0, 0);
  return composed;
}
