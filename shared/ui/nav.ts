/**
 * Rythme des entrées de navigation, partagé par le tiroir principal et celui
 * des réglages.
 *
 * L'entrée est basse (28 px) et légère, comme chez Twenty. Elle ne dit rien de
 * sa **couleur** : le tiroir principal peint chaque module de sa teinte
 * d'adresse, celui des réglages emploie l'accent de la palette. Les deux se
 * relaient dans la même colonne et doivent garder le même rythme — c'est ce
 * que cette constante tient, et rien d'autre.
 */
export const NAV_ITEM_CLASS = "h-7 gap-2 rounded-md px-1.5 text-sm font-normal";

/**
 * L'entrée active des réglages.
 *
 * Le composant shadcn peint le survol et l'actif avec la même variable, si
 * bien qu'on ne distinguait pas l'écran où l'on est de celui que la souris
 * frôle. Ici l'actif prend l'accent de la palette — les réglages n'ont pas de
 * teinte d'adresse, ils sont un lieu et non dix.
 */
export const NAV_ACTIVE_CLASS =
  "data-active:bg-selected data-active:text-brand data-active:font-medium " +
  "data-active:hover:bg-selected data-active:hover:text-brand";
