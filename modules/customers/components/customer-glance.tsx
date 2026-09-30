"use client";

import { useEffect, useState } from "react";
import { PencilIcon, StickyNoteIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import { useAction } from "../hooks/use-customers";
import type { CustomerDetail } from "../lib/types";
import { ContactList } from "./contact-list";

/**
 * Les interlocuteurs et les notes de la fiche, dans l'en-tête (issue 60).
 *
 * Ils vivaient dans le sixième onglet : au téléphone, le numéro de l'architecte
 * était à deux clics, et les notes — l'accès, le code, « ne pas appeler avant
 * dix heures » — ne se lisaient qu'en allant les chercher.
 *
 * L'en-tête n'en garde que l'essentiel : une ligne par personne, trois au plus,
 * sans leurs notes. La liste entière vit dans l'onglet Fiche
 * (`contact-list.tsx`, lectures `compact` et `full`).
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
    <div data-demo="customer-glance" className={cn("flex max-w-2xl flex-col gap-2", className)}>
      <ContactList
        variant="compact"
        customerId={customer.id}
        kind={customer.kind}
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
  const save = useAction((notes: string) => api.updateCustomer(customer.id, { notes }));

  if (draft !== null) {
    return (
      <div className="flex flex-col gap-2">
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

  if (!customer.notes.trim()) {
    if (!canWrite) return null;
    return (
      <Button
        size="xs"
        variant="ghost"
        className="text-muted-foreground -ml-2 w-fit"
        onClick={() => setDraft("")}
      >
        <StickyNoteIcon />
        Ajouter une note
      </Button>
    );
  }

  return (
    <NotesText
      notes={customer.notes}
      onEdit={canWrite ? () => setDraft(customer.notes) : undefined}
    />
  );
}

/**
 * Deux lignes, puis « Voir plus ».
 *
 * Le « … » isolé qu'on voyait sous certaines notes venait d'une ligne vide :
 * `whitespace-pre-line` garde les sauts de ligne, et `line-clamp-2` posait son
 * ellipse au bout de la deuxième ligne — vide, quand la note sautait une ligne
 * après la première. Repliée, la note perd donc ses lignes blanches ; dépliée,
 * elle les retrouve. Et « Voir plus » ne s'affiche que si le texte déborde
 * vraiment, mesuré plutôt que deviné.
 */
function NotesText({ notes, onEdit }: { notes: string; onEdit?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [element, setElement] = useState<HTMLParagraphElement | null>(null);
  const [overflows, setOverflows] = useState(false);
  const folded = notes.replace(/\n\s*\n+/g, "\n").trim();

  useEffect(() => {
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() =>
      setOverflows(element.scrollHeight > element.clientHeight + 1),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, folded]);

  return (
    <div className="flex items-start gap-2">
      <StickyNoteIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p
          ref={setElement}
          className={cn(
            "text-muted-foreground text-xs break-words whitespace-pre-line",
            !expanded && "line-clamp-2",
          )}
        >
          {expanded ? notes.trim() : folded}
        </p>
        {(expanded || overflows) && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mt-0.5 text-xs font-medium"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Voir moins" : "Voir plus"}
          </button>
        )}
      </div>
      {onEdit && (
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Modifier les notes"
          className="text-muted-foreground -mt-1 shrink-0"
          onClick={onEdit}
        >
          <PencilIcon />
        </Button>
      )}
    </div>
  );
}
