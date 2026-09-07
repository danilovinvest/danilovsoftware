import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tone } from "../lib/labels";

/**
 * Les tonalités du CRM (statut de fiche, de devis, de règlement) dépassent les
 * variantes de shadcn : chaque teinte a son fond « soft » déclaré dans
 * globals.css, sur le modèle des tags de Twenty — le cran 3 de la teinte en
 * fond, le cran 11 en texte.
 */
const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-neutral",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

/**
 * Affiche la valeur d'une énumération avec son libellé français et sa
 * tonalité. Une valeur inconnue (API en avance sur le front) s'affiche telle
 * quelle plutôt que de faire planter le rendu.
 */
export function EnumBadge<T extends string>({
  value,
  entries,
  className,
}: {
  value: T;
  entries: Record<string, { label: string; tone: Tone }>;
  className?: string;
}) {
  const entry = entries[value];
  return (
    // Les tags de Twenty sont des rectangles à petit rayon, pas des pastilles :
    // le `rounded-4xl` par défaut de shadcn est ramené au cran `sm` (4 px).
    <Badge
      className={cn(
        "rounded-md",
        TONE_CLASSES[entry?.tone ?? "neutral"],
        className,
      )}
    >
      {entry?.label ?? value}
    </Badge>
  );
}
