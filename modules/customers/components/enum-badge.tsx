import { Badge, type BadgeTone } from "@/shared/ui/badge";

/**
 * Affiche la valeur d'une énumération avec son libellé français et sa tonalité.
 * Une valeur inconnue (API en avance sur le front) s'affiche telle quelle
 * plutôt que de faire planter le rendu.
 */
export function EnumBadge<T extends string>({
  value,
  entries,
}: {
  value: T;
  entries: Record<string, { label: string; tone: BadgeTone }>;
}) {
  const entry = entries[value];
  return <Badge tone={entry?.tone ?? "neutral"}>{entry?.label ?? value}</Badge>;
}
