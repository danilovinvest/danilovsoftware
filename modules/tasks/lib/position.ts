/**
 * Rang d'une carte insérée entre deux voisines.
 *
 * Les positions sont des flottants : insérer au milieu de deux valeurs suffit,
 * sans renuméroter la colonne. Après beaucoup de déplacements au même endroit,
 * les décimales finissent par se tasser — d'où le pas de 1000 à la création,
 * qui laisse de la marge pour des centaines d'insertions.
 */
const STEP = 1000;

export function positionBetween(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return STEP;
  if (before === undefined) return (after as number) - STEP;
  if (after === undefined) return before + STEP;
  return (before + after) / 2;
}
