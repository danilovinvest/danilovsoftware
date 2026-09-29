"use client";

import { useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { askConfirm } from "@/shared/ui/confirm";
import * as api from "../lib/api";
import { useAction } from "../hooks/use-customers";
import type { Contact } from "../lib/types";
import { ContactCoordinates } from "./contact-coordinates";
import { ContactDialog } from "./contact-dialog";

/**
 * Les interlocuteurs de la fiche, et tout ce qu'on en fait, dans l'en-tête.
 *
 * Ils s'affichaient deux fois : ici pour les lire et corriger d'un clic sur le
 * nom, et dans l'onglet Détails, en carte, pour en ajouter et en retirer. Deux
 * listes du même objet avec deux jeux de gestes, et l'on ne savait jamais
 * laquelle ouvrir. Il n'en reste qu'une, ici, qui fait tout : ajouter,
 * corriger, retirer — avec le badge « Principal » et les notes de chacun que
 * la carte était seule à montrer.
 */
export function GlanceContacts({
  customerId,
  contacts,
  canWrite,
  onChanged,
}: {
  customerId: string;
  contacts: Contact[];
  canWrite: boolean;
  onChanged: () => void;
}) {
  /** `undefined` fermé, `null` nouveau, un interlocuteur corrigé sinon. */
  const [editing, setEditing] = useState<Contact | null | undefined>(undefined);
  const remove = useAction((id: string) => api.deleteContact(id));

  async function retirer(contact: Contact) {
    const ok = await askConfirm({
      title: `Retirer ${contact.full_name}`,
      description: "L'interlocuteur et ses coordonnées quittent la fiche, définitivement.",
      confirmLabel: "Retirer",
    });
    if (!ok) return;
    // `!== null` : la route rend 204 sans corps, donc `undefined` en cas de succès.
    if ((await remove.run(contact.id)) !== null) onChanged();
  }

  if (contacts.length === 0 && !canWrite) return null;

  return (
    <div data-demo="contacts-card" className="flex flex-col gap-1">
      {contacts.length > 0 && (
        <ul className="flex flex-col gap-1">
          {contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              canWrite={canWrite}
              busy={remove.pending}
              onEdit={() => setEditing(contact)}
              onRemove={() => void retirer(contact)}
            />
          ))}
        </ul>
      )}

      {canWrite && (
        <button
          type="button"
          data-demo="contact-add"
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-xs"
          onClick={() => setEditing(null)}
        >
          <PlusIcon className="size-3.5" />
          Ajouter un interlocuteur
        </button>
      )}

      {editing !== undefined && (
        <ContactDialog
          key={editing?.id ?? "new"}
          customerId={customerId}
          contact={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          onSaved={onChanged}
        />
      )}
    </div>
  );
}

function ContactRow({
  contact,
  canWrite,
  busy,
  onEdit,
  onRemove,
}: {
  contact: Contact;
  canWrite: boolean;
  busy: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm">
      <UsersIcon className="text-muted-foreground size-3.5 shrink-0" />
      {canWrite ? (
        <button
          type="button"
          className="font-medium hover:underline"
          title="Modifier l'interlocuteur"
          onClick={onEdit}
        >
          {contact.full_name}
        </button>
      ) : (
        <span className="font-medium">{contact.full_name}</span>
      )}
      {contact.is_primary && <Badge variant="secondary">Principal</Badge>}
      <ContactCoordinates contact={contact} />
      {canWrite && (
        <span className="flex shrink-0 items-center">
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Modifier ${contact.full_name}`}
            data-demo="contact-edit"
            onClick={onEdit}
          >
            <PencilIcon />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Retirer ${contact.full_name}`}
            disabled={busy}
            onClick={onRemove}
          >
            <Trash2Icon />
          </Button>
        </span>
      )}
      {contact.notes && (
        <p className="text-muted-foreground basis-full pl-5.5 text-xs whitespace-pre-line line-clamp-2">
          {contact.notes}
        </p>
      )}
    </li>
  );
}
