"use client";

import { ArrowLeftRightIcon, CheckIcon, ShuffleIcon } from "lucide-react";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { MENU_ITEM, MENU_LABEL, MenuAction } from "@/shared/ui/menu-action";
import { formatDate } from "@/shared/lib/format";
import type { Customer, CustomerIssuerChoice, Review } from "../lib/types";
import { ISSUER_CHOICES } from "./customer-issuer";

/*
  Les trois groupes du menu « Statut » : la qualité de client, la société, la
  relecture. Ils ne portent aucun état et aucun appel — le menu se démonte à la
  fermeture, et un geste en cours perdrait sa réponse avec lui. Les écritures
  vivent dans `customer-status.tsx`, qui reste monté.

  Une seule phrase pour rendre la main, et la même des deux côtés : « Laisser
  les pièces décider ». La qualité de client disait « les pièces », la société
  « les devis » — deux mots pour le même geste, alors que la société se déduit
  elle aussi de pièces (devis et affaires attribuées).
*/

/** Ce qui rend la main aux pièces, quand un humain a tranché. */
const RENDRE = "Laisser les pièces décider";

/**
 * Client ou prospect, d'un clic et dans les deux sens (issue 113).
 *
 * La qualité de client se déduit des pièces, et un prospect passe client tout
 * seul dès qu'un devis signé ou une facture le prouve. Or la base porte des
 * pièces fausses : une fiche qu'une facture mal rangée disait cliente ne
 * pouvait pas redevenir prospect, la promotion la reclassait au tour suivant.
 * Le geste pose donc un **choix**, gardé à côté du statut, qui l'emporte sur
 * les pièces partout où la qualité de client se lit.
 */
export function ClientItems({
  customer,
  disabled,
  onChoose,
}: {
  customer: Customer;
  disabled: boolean;
  onChoose: (client: boolean | null) => void;
}) {
  // Ce que la fiche est aujourd'hui : le choix s'il existe, sinon les pièces
  // ou le statut saisi — le même « client » que le badge de l'en-tête.
  const client = customer.client_override ?? (customer.is_client || customer.status === "client");
  const choisi = customer.client_override !== null;
  return (
    <>
      <DropdownMenuLabel className={MENU_LABEL}>Client ou prospect</DropdownMenuLabel>
      <DropdownMenuItem
        className={MENU_ITEM}
        disabled={disabled}
        data-demo="client-toggle"
        onSelect={() => onChoose(!client)}
      >
        <MenuAction
          icon={<ArrowLeftRightIcon />}
          label={client ? "Repasser en prospect" : "Passer en client"}
          hint={
            client
              ? "Quoi que disent ses pièces — la promotion automatique ne la reclassera plus"
              : "Quoi que disent ses pièces"
          }
        />
      </DropdownMenuItem>
      <DropdownMenuItem
        className={MENU_ITEM}
        disabled={disabled || !choisi}
        data-demo="client-auto"
        onSelect={() => onChoose(null)}
      >
        <MenuAction
          icon={<ShuffleIcon />}
          label={RENDRE}
          hint={choisi ? "Revient à la qualité déduite des pièces" : "C'est déjà le cas"}
          trailing={choisi ? undefined : <CheckIcon className="text-muted-foreground size-3.5" />}
        />
      </DropdownMenuItem>
    </>
  );
}

/** La société de la fiche : les deux, l'une, l'autre, ou ce que disent les pièces. */
export function IssuerItems({
  customer,
  disabled,
  onChoose,
}: {
  customer: Customer;
  disabled: boolean;
  onChoose: (issuer: CustomerIssuerChoice | null) => void;
}) {
  const choisie = customer.issuer_override !== null;
  return (
    <>
      <DropdownMenuLabel className={MENU_LABEL}>Société de la fiche</DropdownMenuLabel>
      {(Object.keys(ISSUER_CHOICES) as CustomerIssuerChoice[]).map((valeur) => {
        const choix = ISSUER_CHOICES[valeur];
        const Icone = choix.icon;
        return (
          <DropdownMenuItem
            key={valeur}
            className={MENU_ITEM}
            disabled={disabled}
            onSelect={() => onChoose(valeur)}
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
      {/*
        L'entrée est éteinte quand personne n'a tranché : ce serait un clic sans
        effet, et un menu ne doit pas en proposer.
      */}
      <DropdownMenuItem
        className={MENU_ITEM}
        disabled={disabled || !choisie}
        data-demo="customer-issuer-auto"
        onSelect={() => onChoose(null)}
      >
        <MenuAction
          icon={<ShuffleIcon />}
          label={RENDRE}
          hint={choisie ? "Revient à la société déduite des devis et des affaires" : "C'est déjà le cas"}
          trailing={choisie ? undefined : <CheckIcon className="text-muted-foreground size-3.5" />}
        />
      </DropdownMenuItem>
    </>
  );
}

/**
 * Les deux crans de relecture, distincts du cycle de l'affaire : celui-ci dit
 * où en est la vente, ceux-là ce qu'on sait de la fiche.
 *
 * Ils existent aussi en colonnes dans la liste — c'est là qu'on abat le gros du
 * travail, deux cents fiches à la file. Les deux crans sont **indépendants** :
 * « je l'ai regardée, elle n'est pas absurde » n'est pas « elle est complète ».
 * Les enchaîner reviendrait à n'avoir que le second, donc à ne jamais cocher.
 *
 * Cocher garde le menu ouvert : on coche souvent les deux à la suite.
 */
export function ReviewItems({
  review,
  disabled,
  onToggle,
}: {
  review: Review;
  disabled: boolean;
  onToggle: (field: "verified" | "completed", next: boolean) => void;
}) {
  const cases = [
    { field: "verified", label: "Vérifiée", at: review.verified_at, by: review.verified_by_name },
    {
      field: "completed",
      label: "Fiche complète",
      at: review.completed_at,
      by: review.completed_by_name,
    },
  ] as const;
  return (
    <>
      <DropdownMenuLabel className={MENU_LABEL}>Relecture</DropdownMenuLabel>
      {cases.map((entry) => (
        <DropdownMenuCheckboxItem
          key={entry.field}
          className="px-2 py-1.5"
          checked={entry.at !== null}
          disabled={disabled}
          data-demo={`review-${entry.field}`}
          onSelect={(event) => event.preventDefault()}
          onCheckedChange={(value) => onToggle(entry.field, value === true)}
        >
          <span className="flex min-w-0 flex-col">
            <span className="font-medium">{entry.label}</span>
            {/* La date et l'auteur en clair : c'est ce qui rend la coche vérifiable. */}
            <span className="text-muted-foreground text-xs">
              {entry.at
                ? `${formatDate(entry.at)}${entry.by ? ` · ${entry.by}` : ""}`
                : "Pas encore"}
            </span>
          </span>
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
}
