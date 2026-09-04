"use client";

import {
  FileTextIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PhoneOutgoingIcon,
  ScrollTextIcon,
  StickyNoteIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/shared/ui/feedback";
import { formatDateTime } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { INTERACTION_KIND } from "../lib/labels";
import type { Interaction, InteractionKind } from "../lib/types";

/**
 * La chronologie d'une affaire.
 *
 * L'onglet « Échanges » de la fiche mélange tout ce qui concerne le client,
 * toutes affaires confondues. Ici on ne montre que ce qui touche cette
 * affaire-ci : c'est l'histoire d'une négociation, et une négociation se lit de
 * bout en bout.
 *
 * Une icône par type plutôt qu'une pastille de texte : sur une colonne étroite,
 * sept libellés répétés font un mur, sept icônes se parcourent.
 */

const ICONS: Record<InteractionKind, LucideIcon> = {
  appel: PhoneIcon,
  email: MailIcon,
  relance: PhoneOutgoingIcon,
  rdv: MapPinIcon,
  rapport: ScrollTextIcon,
  devis: FileTextIcon,
  note: StickyNoteIcon,
};

export function ProjectTimeline({
  interactions,
  className,
}: {
  interactions: Interaction[];
  className?: string;
}) {
  if (interactions.length === 0) {
    return (
      <EmptyState
        title="Aucun échange sur cette affaire"
        description="Les appels, relances et visites apparaîtront ici, dans l'ordre."
      />
    );
  }

  // Du plus récent au plus ancien : ce qu'on cherche en ouvrant est ce qui
  // vient de se passer, pas le premier appel d'il y a six mois.
  const ordered = [...interactions].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  return (
    <ol className={cn("flex flex-col", className)}>
      {ordered.map((interaction, index) => {
        const Icon = ICONS[interaction.kind];
        const last = index === ordered.length - 1;

        return (
          <li key={interaction.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border",
                  interaction.kind === "relance"
                    ? "border-warning/40 bg-warning-soft text-warning"
                    : "bg-muted text-muted-foreground border-border",
                )}
              >
                <Icon className="size-3" />
              </span>
              {!last && <span className="bg-border w-px flex-1" />}
            </div>

            <div className="min-w-0 flex-1 pb-4">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-medium">{interaction.summary}</span>
                <span className="text-muted-foreground/70 text-xs">
                  {INTERACTION_KIND[interaction.kind].label}
                </span>
              </div>
              {interaction.details && (
                <p className="text-muted-foreground mt-1 text-xs whitespace-pre-line">
                  {interaction.details}
                </p>
              )}
              <div className="text-muted-foreground/70 mt-1 text-xs">
                {formatDateTime(interaction.occurred_at)}
                {interaction.author_name && ` · ${interaction.author_name}`}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
