"use client";

import { useState } from "react";
import { MailIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import { useAction } from "../hooks/use-customers";
import type { Contact } from "../lib/types";
import { askConfirm } from "@/shared/ui/confirm";
import { ContactDialog } from "./contact-dialog";
import { PhoneLink } from "./customer-list-parts";

/**
 * Le rôle, le numéro et l'adresse d'un interlocuteur, qui s'appellent et
 * s'écrivent d'un geste (issue 60) : au téléphone, le numéro de l'architecte
 * ne doit pas être à recopier.
 */
export function ContactCoordinates({
  contact,
  className,
}: {
  contact: Contact;
  className?: string;
}) {
  const parts = [
    contact.role_label && <span key="role">{contact.role_label}</span>,
    // L'employeur, quand il diffère de la fiche : sur une copropriété, la
    // personne qu'on appelle appartient au cabinet, pas à l'immeuble.
    contact.company_name && <span key="societe">{contact.company_name}</span>,
    // Les autres numéros, comptés plutôt qu'alignés : une carte
    // d'interlocuteur tient sur une ligne, et six numéros la feraient déborder.
    contact.phones.length > 0 && (
      <span key="autres-tel">{`+${contact.phones.length} n° au dossier`}</span>
    ),
    contact.emails.length > 0 && (
      <span key="autres-mails">{`+${contact.emails.length} adresse${contact.emails.length > 1 ? "s" : ""}`}</span>
    ),
    contact.phone && <PhoneLink key="phone" phone={contact.phone} />,
    contact.email && (
      <a
        key="mail"
        href={`mailto:${contact.email}`}
        className="hover:text-foreground inline-flex min-w-0 items-center gap-1 hover:underline"
      >
        <MailIcon className="size-3 shrink-0" />
        <span className="truncate">{contact.email}</span>
      </a>
    ),
  ].filter(Boolean);
  return (
    <span
      className={cn(
        "text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs",
        className,
      )}
    >
      {parts.length > 0 ? parts : "—"}
    </span>
  );
}

export function ContactsCard({
  customerId,
  contacts,
  onChanged,
}: {
  customerId: string;
  contacts: Contact[];
  onChanged: () => void;
}) {
  const canWrite = usePermission("customers:write");
  /** `undefined` fermé, `null` nouveau, un interlocuteur corrigé sinon. */
  const [editing, setEditing] = useState<Contact | null | undefined>(undefined);
  const remove = useAction((id: string) => api.deleteContact(id));

  return (
    <Card className="gap-0 py-0" data-demo="contacts-card">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-sm">Interlocuteurs</CardTitle>
        <CardDescription className="text-xs">
          Architecte, client final, syndic…
        </CardDescription>
        {canWrite && (
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
              <PlusIcon />
              Ajouter
            </Button>
          </CardAction>
        )}
      </CardHeader>

      {contacts.length === 0 ? (
        <EmptyState title="Aucun interlocuteur enregistré" />
      ) : (
        <ul className="divide-y">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {contact.full_name}
                  {contact.is_primary && <Badge variant="secondary">Principal</Badge>}
                </p>
                <ContactCoordinates contact={contact} />
                {contact.notes && (
                  <p className="text-muted-foreground text-xs whitespace-pre-line">
                    {contact.notes}
                  </p>
                )}
              </div>
              {canWrite && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Modifier ${contact.full_name}`}
                    data-demo="contact-edit"
                    onClick={() => setEditing(contact)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Supprimer ${contact.full_name}`}
                    disabled={remove.pending}
                    onClick={async () => {
                      const ok = await askConfirm({
                        title: `Retirer ${contact.full_name}`,
                        description:
                          "L'interlocuteur et ses coordonnées quittent la fiche, définitivement.",
                        confirmLabel: "Retirer",
                      });
                      if (!ok) return;
                      await remove.run(contact.id);
                      onChanged();
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
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
    </Card>
  );
}
