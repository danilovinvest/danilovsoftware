"use client";

import { Building2Icon, ScaleIcon, WrenchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/shared/lib/format";
import type { Customer, CustomerIssuerChoice } from "../lib/types";

/**
 * La société de la fiche, lue sur un badge.
 *
 * Demandé par le dirigeant : « je veux pouvoir changer le badge manuellement
 * donc de dire si le client est groupe ou structure ». La société se déduisait
 * des seuls devis et des affaires attribuées, et trois sources ont peuplé le
 * CRM sans se connaître : un devis rangé du mauvais côté peignait la fiche en
 * STRUCTURE **et** la faisait disparaître de la liste de GROUPE, sans qu'aucun
 * écran ne sache le démentir.
 *
 * Le badge ouvrait son propre menu, la qualité de client avait son bouton, la
 * relecture ses deux cases : trois gestes de même nature — un humain tranche
 * à la place des pièces — posés à trois endroits. Ils vivent désormais dans un
 * seul menu « Statut » (`customer-status.tsx`), que la rangée de badges ouvre
 * tout entière : le badge reste le bouton, il n'est plus le seul.
 *
 * Ce que le clic change est dit avant le clic, et il faut le dire : ranger la
 * fiche dans une société la **cache** à l'autre, puisque le badge et le
 * périmètre lisent la même règle. « Les deux » est la sortie du client qui
 * commande une étude à STRUCTURE puis des travaux à GROUPE.
 */

/** Ce que chaque choix affiche, et ce qu'il change. */
export const ISSUER_CHOICES: Record<
  CustomerIssuerChoice,
  { label: string; hint: string; icon: typeof Building2Icon }
> = {
  "ompt-groupe": {
    label: "OMPT GROUPE",
    hint: "Visible du seul périmètre GROUPE",
    icon: WrenchIcon,
  },
  "ompt-structure": {
    label: "OMPT STRUCTURE",
    hint: "Visible du seul périmètre STRUCTURE",
    icon: ScaleIcon,
  },
  tous: {
    label: "Les deux",
    hint: "Visible des deux périmètres",
    icon: Building2Icon,
  },
};

/**
 * L'apparence du badge selon la société lue.
 *
 * Les deux sociétés gardent celle de la liste — cran 9 de la teinte en fond et
 * `--background` en encre, jamais du blanc, puisque l'échelle bascule en thème
 * sombre. « Mixte » et « on ne sait pas » restent gris : une troisième couleur
 * pour deux sociétés ferait trois choses à apprendre, et peindre une fiche
 * mixte de l'une des deux serait faux une fois sur deux.
 *
 * L'inconnu se nomme ici, là où la liste n'affiche rien : la fiche est
 * l'endroit où l'on range, et un badge absent n'offrirait rien à cliquer.
 */
const APPARENCE: Record<string, { label: string; className: string }> = {
  "ompt-groupe": { label: "GROUPE", className: "bg-info text-background" },
  "ompt-structure": { label: "STRUCTURE", className: "bg-success text-background" },
  mixte: { label: "LES DEUX", className: "bg-muted text-muted-foreground" },
};

const INCONNUE = { label: "Société ?", className: "bg-muted text-muted-foreground" };

export function CustomerIssuerBadge({ customer }: { customer: Customer }) {
  const apparence = APPARENCE[customer.issuer] ?? INCONNUE;
  return (
    <span
      data-demo="customer-issuer"
      title={issuerTitle(customer)}
      className={cn(
        "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide",
        apparence.className,
      )}
    >
      {apparence.label}
      {/*
        La marque du choix : un point, et rien de plus. Une couleur de plus
        dirait « attention » là où il n'y a qu'un rangement assumé.
      */}
      {customer.issuer_override !== null && (
        <span aria-hidden className="size-1 rounded-full bg-current opacity-70" />
      )}
    </span>
  );
}

/** Ce que le survol du badge dit : d'où vient la société affichée. */
export function issuerTitle(customer: Customer): string {
  if (customer.issuer_override !== null) {
    const quand = customer.issuer_override_at
      ? ` le ${formatDate(customer.issuer_override_at)}`
      : "";
    const qui = customer.issuer_override_by_name ? ` par ${customer.issuer_override_by_name}` : "";
    return `Société choisie à la main${quand}${qui}`;
  }
  if (customer.issuer === "mixte") return "Déduite de ses pièces : les deux sociétés";
  if (!customer.issuer) return "Aucune pièce ne la range : la fiche est visible des deux côtés";
  return "Déduite de ses devis et de ses affaires";
}
