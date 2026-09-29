"use client";

import { useState } from "react";
import { PencilIcon, StickyNoteIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import { useAction } from "../hooks/use-customers";
import type { CustomerDetail } from "../lib/types";
import { GlanceContacts } from "./glance-contacts";

/**
 * Les interlocuteurs et les notes de la fiche, dans l'en-tête (issue 60).
 *
 * Ils vivaient dans le sixième onglet : au téléphone, le numéro de l'architecte
 * était à deux clics, et les notes — l'accès, le code, « ne pas appeler avant
 * dix heures » — ne se lisaient qu'en allant les chercher.
 *
 * C'est désormais le seul endroit où les interlocuteurs se gèrent : l'onglet
 * Fiche n'en porte plus de seconde liste (voir `glance-contacts.tsx`).
 */
export function CustomerGlance({
  customer,
  onChanged,
  className,
}: {
  customer: CustomerDetail;
  onChanged: () => void;
  className?: string;
}) {
  const canWrite = usePermission("customers:write");
  if (customer.contacts.length === 0 && !customer.notes && !canWrite) return null;

  return (
    <div data-demo="customer-glance" className={cn("flex flex-col gap-2", className)}>
      <GlanceContacts
        customerId={customer.id}
        contacts={customer.contacts}
        canWrite={canWrite}
        onChanged={onChanged}
      />
      <CustomerNotes customer={customer} canWrite={canWrite} onChanged={onChanged} />
    </div>
  );
}

/**
 * Les notes de la fiche, lues et corrigées sur place.
 *
 * L'écriture n'envoie que `notes` : la route de la fiche garde le reste
 * (`httpx.DecodeJSONOver`), et corriger une note ne rouvre pas le formulaire
 * entier.
 */
function CustomerNotes({
  customer,
  canWrite,
  onChanged,
}: {
  customer: CustomerDetail;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const save = useAction((notes: string) => api.updateCustomer(customer.id, { notes }));

  if (draft !== null) {
    return (
      <div className="flex max-w-2xl flex-col gap-2">
        <Textarea
          autoFocus
          aria-label="Notes de la fiche"
          className="min-h-20 text-sm"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={save.pending}
            onClick={async () => {
              if ((await save.run(draft)) === null) return;
              setDraft(null);
              onChanged();
            }}
          >
            Enregistrer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  if (!customer.notes) {
    if (!canWrite) return null;
    return (
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-xs"
        onClick={() => setDraft("")}
      >
        <StickyNoteIcon className="size-3.5" />
        Ajouter une note
      </button>
    );
  }

  return (
    <div className="flex max-w-2xl items-start gap-2 text-sm">
      <StickyNoteIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
      <button
        type="button"
        title={expanded ? "Replier" : "Tout lire"}
        className={cn(
          "text-muted-foreground min-w-0 text-left whitespace-pre-line",
          !expanded && "line-clamp-2",
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {customer.notes}
      </button>
      {canWrite && (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Modifier les notes"
          className="shrink-0"
          onClick={() => setDraft(customer.notes)}
        >
          <PencilIcon />
        </Button>
      )}
    </div>
  );
}
