"use client";

import { Building2Icon, CheckIcon, ChevronDownIcon, ScaleIcon, ShuffleIcon, WrenchIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MENU_ITEM, MENU_LABEL, MenuAction } from "@/shared/ui/menu-action";
import { formatDate } from "@/shared/lib/format";
import { ErrorNotice } from "@/shared/ui/feedback";
import { useAction } from "../hooks/use-customers";
import * as api from "../lib/api";
import type { Customer, CustomerIssuerChoice } from "../lib/types";

/**
 * La société de la fiche, lue sur un badge et changée par le même geste.
 *
 * Demandé par le dirigeant : « je veux pouvoir changer le badge manuellement
 * donc de dire si le client est groupe ou structure ». La société se déduisait
 * des seuls devis et des affaires attribuées, et trois sources ont peuplé le
 * CRM sans se connaître : un devis rangé du mauvais côté peignait la fiche en
 * STRUCTURE **et** la faisait disparaître de la liste de GROUPE, sans qu'aucun
 * écran ne sache le démentir.
 *
 * Le badge devient donc le bouton : on ne cherche pas ailleurs le réglage de ce
 * qu'on est en train de lire. Le choix vit à côté de la déduction, comme celui
 * de la qualité de client (issue 113) — il l'emporte sur elle, il se relit, et
 * il se retire.
 *
 * Ce que le clic change est dit avant le clic, et il faut le dire : ranger la
 * fiche dans une société la **cache** à l'autre, puisque le badge et le
 * périmètre lisent la même règle. « Les deux » est la sortie du client qui
 * commande une étude à STRUCTURE puis des travaux à GROUPE.
 */

/** Ce que chaque choix affiche, et ce qu'il change. */
const CHOIX: Record<
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

export function CustomerIssuerBadge({
  customer,
  canWrite,
  onChanged,
}: {
  customer: Customer;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const choisir = useAction(
    (issuer: CustomerIssuerChoice | null) => api.setCustomerIssuer(customer.id, issuer),
    { inline: true },
  );

  const apparence = APPARENCE[customer.issuer] ?? INCONNUE;
  const choisie = customer.issuer_override !== null;
  const badge = (
    <span
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
      {choisie && <span aria-hidden className="size-1 rounded-full bg-current opacity-70" />}
    </span>
  );

  // Sans droit d'écriture, le badge se lit et ne s'ouvre pas : un menu qui
  // refuse à l'ouverture est pire qu'un menu absent.
  if (!canWrite) {
    return (
      <span data-demo="customer-issuer" title={titre(customer)}>
        {badge}
      </span>
    );
  }

  async function poser(next: CustomerIssuerChoice | null) {
    if ((await choisir.run(next)) !== null) onChanged();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-demo="customer-issuer"
          disabled={choisir.pending}
          aria-label={`Société de la fiche : ${apparence.label}`}
          title={titre(customer)}
          className="hover:bg-muted flex items-center gap-0.5 rounded-md py-0.5 pr-1 disabled:opacity-60"
        >
          {badge}
          <ChevronDownIcon className="text-muted-foreground size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-1.5">
        <DropdownMenuLabel className={MENU_LABEL}>Société de la fiche</DropdownMenuLabel>
        {(Object.keys(CHOIX) as CustomerIssuerChoice[]).map((valeur) => {
          const choix = CHOIX[valeur];
          const Icone = choix.icon;
          return (
            <DropdownMenuItem
              key={valeur}
              className={MENU_ITEM}
              onSelect={() => void poser(valeur)}
            >
              <MenuAction
                icon={<Icone />}
                label={choix.label}
                hint={choix.hint}
                trailing={
                  customer.issuer_override === valeur ? (
                    <CheckIcon className="text-muted-foreground size-3.5" />
                  ) : undefined
                }
              />
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="my-1.5" />
        {/*
          Rendre la main aux devis. L'entrée est éteinte quand personne n'a
          tranché : ce serait un clic sans effet, et un menu ne doit pas en
          proposer.
        */}
        <DropdownMenuItem
          className={MENU_ITEM}
          disabled={!choisie}
          data-demo="customer-issuer-auto"
          onSelect={() => void poser(null)}
        >
          <MenuAction
            icon={<ShuffleIcon />}
            label="Laisser les devis décider"
            hint={choisie ? "Revient à la société déduite des pièces" : "C'est déjà le cas"}
            trailing={
              choisie ? undefined : <CheckIcon className="text-muted-foreground size-3.5" />
            }
          />
        </DropdownMenuItem>
        {choisir.error && (
          <div className="px-2 pt-1.5">
            <ErrorNotice message={choisir.error} />
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * La phrase qui dit que la société a été rangée à la main, et par qui.
 *
 * Elle vit sous les coordonnées, à côté du même aveu sur la qualité de client :
 * ce sont les deux endroits où un humain contredit les pièces, et ils se
 * relisent ensemble. Le retour est offert au même endroit — un choix qui
 * contredit les faits doit pouvoir se retirer là où on le lit.
 */
export function CustomerIssuerNote({
  customer,
  onChanged,
}: {
  customer: Customer;
  onChanged: () => void;
}) {
  const rendre = useAction(() => api.setCustomerIssuer(customer.id, null), { inline: true });
  if (customer.issuer_override === null) return null;

  return (
    <span className="text-muted-foreground text-xs" data-demo="customer-issuer-override">
      Société {CHOIX[customer.issuer_override].label} choisie à la main
      {customer.issuer_override_at && ` le ${formatDate(customer.issuer_override_at)}`}
      {customer.issuer_override_by_name && ` par ${customer.issuer_override_by_name}`}
      {" · "}
      <button
        type="button"
        className="hover:text-foreground underline underline-offset-2"
        disabled={rendre.pending}
        onClick={async () => {
          if ((await rendre.run()) !== null) onChanged();
        }}
      >
        laisser les devis décider
      </button>
      {rendre.error && <ErrorNotice message={rendre.error} />}
    </span>
  );
}

/** Ce que le survol du badge dit : d'où vient la société affichée. */
function titre(customer: Customer): string {
  if (customer.issuer_override !== null) {
    const quand = customer.issuer_override_at
      ? ` le ${formatDate(customer.issuer_override_at)}`
      : "";
    const qui = customer.issuer_override_by_name ? ` par ${customer.issuer_override_by_name}` : "";
    return `Société choisie à la main${quand}${qui}`;
  }
  if (customer.issuer === "mixte") return "Déduite de ses devis : les deux sociétés";
  if (!customer.issuer) return "Aucun devis ne la range : la fiche est visible des deux côtés";
  return "Déduite de ses devis et de ses affaires";
}
