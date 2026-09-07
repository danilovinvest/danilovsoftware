/**
 * Rythme et couleur des entrées de navigation, partagés par le tiroir principal
 * et celui des réglages.
 *
 * L'entrée est basse (28 px) et en gris secondaire, comme chez Twenty. Elle
 * s'en écarte sur un point : **l'entrée active prend la teinte de la palette**,
 * pas un aplat gris.
 *
 * Le composant shadcn peint le survol et l'actif avec la même variable
 * (`--sidebar-accent`), si bien qu'on ne distinguait pas l'écran où l'on est de
 * celui que la souris frôle — et sur une colonne de dix entrées en gris clair,
 * c'est la seule information qu'on y cherche vraiment. La teinte la donne d'un
 * coup d'œil, et elle suit la palette choisie dans les réglages plutôt qu'une
 * couleur écrite en dur.
 *
 * Les deux tiroirs se relaient dans la même colonne : la constante vit ici pour
 * qu'ils ne puissent pas dériver l'un de l'autre.
 */
export const NAV_ITEM_CLASS = [
  "h-7 gap-2 rounded-[4px] px-1.5 text-sm font-normal",
  "data-active:bg-selected data-active:text-brand data-active:font-medium",
  "data-active:hover:bg-selected data-active:hover:text-brand",
].join(" ");
