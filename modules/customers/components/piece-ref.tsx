import { cn } from "@/lib/utils";
import { issuerLetter, issuerName } from "../lib/piece-ref";
import { TONE_CLASSES } from "./enum-badge";

/**
 * Un numéro de pièce, précédé de la lettre de sa société (G ou S).
 *
 * Le même numéro existe chez les deux sociétés : la lettre est ce qui les
 * distingue, partout où une référence s'affiche — la ligne d'un devis, une
 * preuve de la frise, un chantier. Elle garde la teinte du badge de société
 * (GROUPE bleu, STRUCTURE vert) pour qu'on la reconnaisse avant de la lire.
 */
export function PieceRef({
  issuer,
  reference,
  fallback = "Devis",
  className,
}: {
  issuer: string | null | undefined;
  reference: string;
  /** Ce qui s'affiche quand la pièce n'a pas de numéro. */
  fallback?: string;
  className?: string;
}) {
  const letter = issuerLetter(issuer);
  return (
    <span
      data-demo="piece-ref"
      className={cn("inline-flex items-center gap-1 font-mono text-xs", className)}
    >
      {letter && (
        <span
          title={issuerName(issuer) ?? undefined}
          aria-label={issuerName(issuer) ?? undefined}
          className={cn(
            "rounded-sm px-1 text-[0.65rem] leading-4 font-semibold",
            TONE_CLASSES[letter === "G" ? "info" : "success"],
          )}
        >
          {letter}
        </span>
      )}
      <span>{reference || fallback}</span>
    </span>
  );
}
