import type { Tone } from "@/modules/customers";
import { TONE_SOFT } from "@/shared/ui/panel";
import { cn } from "@/lib/utils";

/** Le point plein de la pastille, à la teinte du statut. */
const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-neutral",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/** Le liseré : assez pour détacher la pastille d'une ligne blanche, pas plus. */
const TONE_RING: Record<Tone, string> = {
  neutral: "ring-neutral/25",
  info: "ring-info/30",
  success: "ring-success/30",
  warning: "ring-warning/35",
  danger: "ring-danger/30",
};

/**
 * Le statut d'un chantier ou d'une étude.
 *
 * Un libellé gris-teinté de onze pixels se lisait comme une étiquette parmi
 * d'autres : c'est pourtant la première chose qu'on cherche sur la ligne. Il
 * porte donc un point plein, un liseré et un texte en gras — le point se voit
 * de loin, le texte se lit de près.
 */
export function StatusPill({
  label,
  tone,
  className,
}: {
  label: string;
  tone: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset",
        TONE_SOFT[tone],
        TONE_RING[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone])} />
      {label}
    </span>
  );
}

export { TONE_DOT };
