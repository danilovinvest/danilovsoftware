/**
 * Rythme des entrées de navigation, partagé par le tiroir principal et celui
 * des réglages.
 *
 * L'entrée est haute (36 px) et aérée : c'est une liste qu'on vise au pouce
 * autant qu'à la souris, et vingt-huit pixels serraient dix entrées en un bloc
 * qu'il fallait lire ligne à ligne. Les icônes sont grises, toutes : la
 * couleur est réservée à l'entrée où l'on est.
 *
 * L'intitulé ne porte pas sa propre couleur. Il suit celle du bouton, sans
 * quoi l'entrée active garderait un texte sombre sur sa pilule sombre.
 */
export const NAV_ITEM_CLASS =
  "h-9 gap-2.5 rounded-xl px-2.5 text-[13.5px] font-normal text-foreground/80 " +
  "[&_svg]:text-muted-foreground";

/**
 * L'entrée active : une pilule pleine, à l'encre du texte.
 *
 * Le composant shadcn peint le survol et l'actif avec la même variable, si
 * bien qu'on ne distinguait pas l'écran où l'on est de celui que la souris
 * frôle. Une pilule pleine ne se confond avec rien.
 *
 * `--foreground` et non une teinte : c'est le seul fond qui garde son
 * contraste dans toutes les palettes et les deux thèmes — sombre en clair,
 * clair en sombre — avec `--background` pour encre. Le cran 9 d'une palette
 * est clair sur l'ambre et le citron, où une encre blanche disparaît.
 */
export const NAV_ACTIVE_CLASS =
  "data-active:bg-foreground data-active:text-background data-active:font-medium " +
  "data-active:shadow-md data-active:shadow-foreground/15 " +
  "data-active:hover:bg-foreground/90 data-active:hover:text-background " +
  "data-active:[&_svg]:text-background";
