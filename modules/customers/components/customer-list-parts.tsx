"use client";

import { useState } from "react";
import { AlertTriangleIcon, ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { TONE_SOFT, TONE_TEXT } from "@/shared/ui/panel";
import { notifyError } from "@/shared/ui/toaster";
import { errorMessage } from "@/shared/api/errors";
import { formatDate, formatPhone } from "@/shared/lib/format";
import * as api from "../lib/api";
import { nextAction, readCycle, type CycleOrders, type Metier, type NextAction } from "../lib/cycle";
import { EMPTY_MARKS, readJalons } from "../lib/jalons";
import type { CustomerFilters, ProjectSummary, Review } from "../lib/types";

/*
  Les morceaux communs au tableau et aux cartes de la liste des fiches.

  Sous 768 pixels la liste passe en cartes (issue 85) : les deux présentations
  lisent la même ligne et doivent dire la même chose — la même société, la même
  prochaine action, les mêmes cases de relecture. Deux copies auraient divergé
  au premier ajustement.
*/

/**
 * La société d'une fiche, dite par un badge plein.
 *
 * Demandé par le dirigeant : « je veux pouvoir voir dans la fiche mais sans
 * cliquer dessus si c'est une affaire de groupe ou structure ». La première
 * réponse teintait la **ligne entière** ; il l'a refusée — « trop light, trop
 * pastel, et trop bizarre » — et il a raison sur le fond : un fond de ligne
 * doit rester assez pâle pour ne pas effacer le texte qu'il porte, donc il ne
 * peut pas être franc. Un badge, lui, n'a rien à laisser lisible derrière lui.
 *
 * Cran 9 de la teinte en fond et `--background` en encre, jamais du blanc :
 * l'échelle bascule en thème sombre et un blanc en dur y disparaîtrait. C'est
 * `TONE_BUTTON` sans son survol, la même construction que les boutons teintés.
 *
 * **Deux cas n'ont pas de badge, et c'est un choix.** Une fiche mixte porte les
 * deux sociétés (34 sur 418) : lui en donner un serait faux une fois sur deux,
 * et la fiche reste entière des deux côtés — c'est la doctrine du périmètre.
 * Une fiche sans devis ni affaire attribuée (116) n'est rangée nulle part.
 * Une troisième pastille pour « on ne sait pas » ferait trois choses à
 * apprendre pour deux sociétés, et remplirait la colonne de bruit.
 */
export const ISSUER_BADGE: Record<string, { label: string; className: string }> = {
  "ompt-groupe": { label: "GROUPE", className: "bg-info text-background" },
  "ompt-structure": { label: "STRUCTURE", className: "bg-success text-background" },
};

export function IssuerBadge({ issuer }: { issuer: string }) {
  const societe = ISSUER_BADGE[issuer];
  if (!societe) return null;
  return (
    <span
      data-demo="fiche-societe"
      title={`Affaire OMPT ${societe.label}`}
      className={cn(
        "ml-2 rounded-md px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide",
        societe.className,
      )}
    >
      {societe.label}
    </span>
  );
}

/**
 * Un numéro qui s'appelle d'un geste (issue 85).
 *
 * La liste se lit au téléphone, et recopier dix chiffres d'un écran dans le
 * composeur du même appareil est exactement le geste qu'un lien `tel:` évite.
 * L'adresse du lien ne garde que les chiffres et le plus : les espaces et les
 * points d'un numéro saisi à la main ne font pas partie d'un numéro composé.
 */
export function PhoneLink({ phone, className }: { phone: string; className?: string }) {
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
      data-demo="fiche-telephone"
      className={cn("hover:text-foreground hover:underline", className)}
    >
      {formatPhone(phone)}
    </a>
  );
}

type Sort = NonNullable<CustomerFilters["sort"]>;

/**
 * Un en-tête de colonne qui trie (issue 85).
 *
 * Il ne fait que choisir l'un des tris que le serveur connaît déjà — le
 * sélecteur « Trier par » reste là pour les deux qui n'ont pas de colonne, la
 * date de demande et la dernière modification. Cliquer une colonne déjà
 * triée rend le tri d'arrivée, `fallback` : un en-tête qui ne sait que trier
 * ne se défait qu'en passant par le sélecteur, ce qu'on ne devine pas.
 */
export function SortButton({
  label,
  value,
  fallback,
  current,
  onSort,
  align = "left",
}: {
  label: string;
  value: Sort;
  fallback: Sort;
  current: Sort;
  onSort?: (sort: Sort) => void;
  align?: "left" | "right";
}) {
  if (!onSort) return <>{label}</>;
  const active = current === value;
  const Icon = active ? (value === "name" ? ArrowUpIcon : ArrowDownIcon) : ArrowUpDownIcon;
  return (
    <button
      type="button"
      data-demo="fiche-tri-colonne"
      onClick={() => onSort(active ? fallback : value)}
      className={cn(
        "hover:text-foreground inline-flex items-center gap-1",
        align === "right" && "flex-row-reverse",
        active && "text-foreground",
      )}
      title={active ? "Revenir au tri précédent" : `Trier par ${label.toLowerCase()}`}
    >
      {label}
      <Icon className={cn("size-3", !active && "opacity-40")} />
    </button>
  );
}

/*
Une case de relecture.

Deux crans indépendants, et le CRM ne les enchaîne pas : déclarer une fiche
complète sans l'avoir cochée « vérifiée » est le droit de celui qui relit, pas
une incohérence à corriger dans son dos.

La coche part au serveur seule — jamais les deux à la fois — pour qu'un collègue
qui relit la même fiche au même moment ne se fasse pas décocher.
*/
export function ReviewBox({
  customerId,
  name,
  review,
  field,
  editable,
  onChanged,
}: {
  customerId: string;
  name: string;
  review: Review;
  field: "verified" | "completed";
  editable: boolean;
  onChanged: (next: Review) => void;
}) {
  const [pending, setPending] = useState(false);
  const at = field === "verified" ? review.verified_at : review.completed_at;
  const by = field === "verified" ? review.verified_by_name : review.completed_by_name;
  const quoi = field === "verified" ? "Première vérification faite" : "Fiche complète";

  async function toggle(next: boolean) {
    setPending(true);
    try {
      onChanged(await api.setCustomerReview(customerId, { [field]: next }));
    } catch (cause) {
      // Sans ce message, la case revenait à son état sans rien dire.
      notifyError(errorMessage(cause), () => void toggle(next));
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex">
      <Checkbox
        checked={at !== null}
        disabled={!editable || pending}
        onCheckedChange={(value) => toggle(value === true)}
        aria-label={`${quoi} : ${name}`}
        // La date et l'auteur au survol : « complète depuis quand, par qui »
        // est la première question posée le jour où elle ne l'est plus.
        title={at ? `${quoi} le ${formatDate(at)}${by ? ` par ${by}` : ""}` : quoi}
        className={cn(pending && "opacity-50")}
      />
    </span>
  );
}

/** La phrase du moment : teintée seulement quand elle réclame quelque chose. */
export function ActionCell({ action }: { action: NextAction }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {action.alert && (
        <AlertTriangleIcon className={cn("size-3.5 shrink-0", TONE_TEXT[action.tone])} />
      )}
      <span
        className={cn(
          "truncate rounded-md text-xs",
          action.alert
            ? cn(TONE_SOFT[action.tone], "px-1.5 py-0.5 font-medium")
            : "text-muted-foreground",
        )}
        title={action.detail}
      >
        {action.title}
      </span>
    </div>
  );
}

/**
 * Lire une affaire depuis la ligne de liste.
 *
 * Sans devis ni échange, les jalons partent vides et le cycle se rabat sur
 * l'étape enregistrée. C'est le compromis assumé : la liste situe, la fiche
 * détaille.
 */
export function readListProject(
  project: ProjectSummary,
  now: number,
  metier: Metier,
  orders: CycleOrders,
) {
  const jalons = readJalons(project.id, [], undefined, project);
  const points = readCycle(project, [], [], jalons, now, metier, EMPTY_MARKS, orders);
  return {
    project,
    points,
    quotes: [],
    action: nextAction(points, project, [], jalons, now),
  };
}
