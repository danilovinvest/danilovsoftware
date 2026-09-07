"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import type { Review } from "../lib/types";

/*
Les deux crans de relecture, sur la fiche ouverte.

Ils existent aussi en colonnes dans la liste — c'est là qu'on abat le gros du
travail, deux cents fiches à la file. Mais on décide qu'une fiche est complète
en la lisant, pas en la survolant : les cases sont donc aussi ici, à portée du
regard qui vient de vérifier l'adresse.

Les deux crans sont **indépendants**. « Je l'ai regardée, elle n'est pas
absurde » n'est pas « elle est complète » : la première se donne en dix secondes
sur trois cents fiches, la seconde demande d'aller chercher ce qui manque. Les
enchaîner reviendrait à n'avoir que la seconde, donc à ne jamais cocher.
*/
export function ReviewChecks({
  customerId,
  review,
  editable,
  className,
}: {
  customerId: string;
  review: Review;
  editable: boolean;
  className?: string;
}) {
  // L'état vient d'abord du serveur, puis de nos propres coches : recharger la
  // fiche entière pour voir une case se cocher serait un aller-retour pour rien.
  const [state, setState] = useState<Review | null>(null);
  const [pending, setPending] = useState<"verified" | "completed" | null>(null);
  const current = state ?? review;

  async function toggle(field: "verified" | "completed", next: boolean) {
    setPending(field);
    try {
      setState(await api.setCustomerReview(customerId, { [field]: next }));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-2", className)}>
      <Case
        label="Vérifiée"
        at={current.verified_at}
        by={current.verified_by_name}
        editable={editable}
        pending={pending === "verified"}
        onToggle={(next) => toggle("verified", next)}
      />
      <Case
        label="Fiche complète"
        at={current.completed_at}
        by={current.completed_by_name}
        editable={editable}
        pending={pending === "completed"}
        onToggle={(next) => toggle("completed", next)}
      />
    </div>
  );
}

function Case({
  label,
  at,
  by,
  editable,
  pending,
  onToggle,
}: {
  label: string;
  at: string | null;
  by: string;
  editable: boolean;
  pending: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 text-sm",
        editable ? "cursor-pointer" : "cursor-default",
        pending && "opacity-50",
      )}
    >
      <Checkbox
        checked={at !== null}
        disabled={!editable || pending}
        onCheckedChange={(value) => onToggle(value === true)}
      />
      <span className={at ? "font-medium" : "text-muted-foreground"}>{label}</span>
      {/* La date et l'auteur en clair, pas au survol : sur la fiche il y a la
          place, et c'est ce qui rend la coche vérifiable. */}
      {at && (
        <span className="text-muted-foreground/70 text-xs">
          {formatDate(at)}
          {by && ` · ${by}`}
        </span>
      )}
    </label>
  );
}
