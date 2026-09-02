import { cn } from "@/lib/utils";

/**
 * La marque du CRM.
 *
 * Un profilé métallique vu en section — deux semelles et une âme. C'est
 * l'objet qui revient dans presque tous les devis du bureau d'études
 * (« renforcement par structure métallique »), il est purement géométrique
 * donc lisible à seize pixels, et il dit le métier sans écrire son nom.
 *
 * Il remplace deux marques qui coexistaient sans se ressembler : une pastille
 * portant la lettre « D » dans le tiroir, une boussole sur la page de
 * connexion. Un produit n'a qu'un logo.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-4", className)}
      role="img"
      aria-label="Danilov CRM"
    >
      {/* Semelle supérieure */}
      <rect x="4.5" y="4.5" width="15" height="3.2" rx="1.1" />
      {/* Âme */}
      <rect x="10.4" y="7.7" width="3.2" height="8.6" />
      {/* Semelle inférieure */}
      <rect x="4.5" y="16.3" width="15" height="3.2" rx="1.1" />
    </svg>
  );
}

/**
 * La marque sur sa tuile, telle qu'elle apparaît dans le tiroir et sur la page
 * de connexion. Le fond utilise `--brand`, donc il suit le thème sombre.
 */
export function LogoTile({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-brand grid size-9 shrink-0 place-items-center rounded-lg text-white",
        className,
      )}
    >
      <Logo className={cn("size-5", markClassName)} />
    </span>
  );
}
