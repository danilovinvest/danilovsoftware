"use client";

import { cn } from "@/lib/utils";
import { Spinner } from "@/shared/ui/feedback";
import { GoogleMark } from "./google-mark";

/**
 * Le bouton « Se connecter avec Google », aux mesures de Google.
 *
 * Ses couleurs sont écrites en dur, seule exception du CRM à la règle du
 * thème — et pour la même raison que le logo : les règles d'identité de Google
 * fixent le fond, la bordure et la couleur du texte, en clair comme en sombre.
 * Les reprendre par des jetons de notre échelle donnerait un bouton
 * ressemblant, donc non conforme, et surtout méconnaissable là où il doit être
 * reconnu du premier coup d'œil.
 *
 * Le libellé aussi vient de Google : c'est la formulation française approuvée.
 * Le CRM explique à côté ce qui va réellement se passer, plutôt que de
 * réécrire le bouton.
 */
export function GoogleButton({
  onClick,
  pending = false,
  disabled = false,
  className,
}: {
  onClick: () => void;
  pending?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className={cn(
        "inline-flex h-10 items-center gap-3 rounded-full border pr-4 pl-3",
        "text-sm font-medium transition-shadow",
        "border-[#747775] bg-white text-[#1f1f1f]",
        "dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3]",
        "hover:shadow-md disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
        className,
      )}
    >
      {pending ? (
        <Spinner className="size-[18px]" />
      ) : (
        <GoogleMark className="size-[18px]" />
      )}
      Se connecter avec Google
    </button>
  );
}
