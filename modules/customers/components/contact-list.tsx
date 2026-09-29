"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { askConfirm } from "@/shared/ui/confirm";
import * as api from "../lib/api";
import { useAction } from "../hooks/use-customers";
import type { Contact } from "../lib/types";
import { ContactDialog } from "./contact-dialog";
import { CompactContactRow, FullContactRow, type ContactGestures } from "./contact-rows";

/** Combien de personnes l'en-tête montre avant de renvoyer à l'onglet Fiche. */
const HEADER_LIMIT = 3;

type ListProps = {
  customerId: string;
  contacts: Contact[];
  canWrite: boolean;
  onChanged: () => void;
};

/**
 * Les interlocuteurs d'une fiche, en deux lectures d'une même liste.
 *
 * - `compact`, sous le nom du client : qui appeler, une ligne par personne,
 *   le principal d'abord, trois au plus — de quoi décrocher sans changer
 *   d'onglet ;
 * - `full`, dans l'onglet Fiche : chaque personne en entier, notes comprises,
 *   et c'est là que « Ajouter » a sa place principale.
 *
 * Les gestes sont les mêmes des deux côtés et ne s'écrivent qu'ici : corriger
 * (clic sur le nom ou « … »), définir comme principal, supprimer (confirmé).
 * Le lot du 29/09 avait retiré la carte de l'onglet Fiche au profit de l'en-
 * tête seul ; le dirigeant ne les y trouvait plus, et l'en-tête, qui portait
 * tout — rôles à rallonge, notes, adresses —, était devenu illisible.
 */
export function ContactList({
  variant,
  ...props
}: ListProps & { variant: "compact" | "full" }) {
  const { gestures, dialog, openNew } = useContactGestures(props);
  const sorted = byPrimary(props.contacts);
  // L'en-tête se tait quand il n'a rien à dire ; la carte, elle, dit « aucun ».
  if (variant === "compact" && sorted.length === 0 && !props.canWrite) return null;

  return variant === "compact" ? (
    <CompactList contacts={sorted} gestures={gestures} canWrite={props.canWrite} onAdd={openNew}>
      {dialog}
    </CompactList>
  ) : (
    <FullList contacts={sorted} gestures={gestures} canWrite={props.canWrite} onAdd={openNew}>
      {dialog}
    </FullList>
  );
}

type VariantProps = {
  contacts: Contact[];
  gestures: (contact: Contact) => ContactGestures;
  canWrite: boolean;
  onAdd: () => void;
  children: React.ReactNode;
};

function CompactList({ contacts, gestures, canWrite, onAdd, children }: VariantProps) {
  const shown = contacts.slice(0, HEADER_LIMIT);
  const rest = contacts.length - shown.length;
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-1">
      {shown.length > 0 && (
        <ul className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] gap-x-3">
          {shown.map((contact) => (
            <CompactContactRow key={contact.id} contact={contact} gestures={gestures(contact)} />
          ))}
        </ul>
      )}
      {(rest > 0 || canWrite) && (
        <div className="-ml-2 flex items-center gap-1">
          {rest > 0 && (
            <Button asChild size="xs" variant="ghost" className="text-muted-foreground">
              <Link href={`${pathname}?vue=fiche`} replace scroll={false}>
                <UsersIcon />
                {`+ ${rest} autre${rest > 1 ? "s" : ""}`}
              </Link>
            </Button>
          )}
          {canWrite && (
            <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={onAdd}>
              <PlusIcon />
              Ajouter un interlocuteur
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function FullList({ contacts, gestures, canWrite, onAdd, children }: VariantProps) {
  return (
    <Card className="gap-0 py-0" data-demo="contacts-card">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-sm">
          Interlocuteurs
          {contacts.length > 0 && (
            <span className="text-muted-foreground ml-1.5 font-normal">{contacts.length}</span>
          )}
        </CardTitle>
        {canWrite && (
          <CardAction>
            <Button size="sm" variant="outline" data-demo="contact-add" onClick={onAdd}>
              <PlusIcon />
              Ajouter
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="py-4 text-sm">
        {contacts.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Aucun interlocuteur.
            {canWrite &&
              " L'architecte, le syndic ou le gardien qu'on appelle pour ce client s'ajoutent ici."}
          </p>
        ) : (
          <ul className="divide-y">
            {contacts.map((contact, index) => (
              <FullContactRow
                key={contact.id}
                contact={contact}
                gestures={gestures(contact)}
                demo={index === 0 ? "contact-edit" : undefined}
              />
            ))}
          </ul>
        )}
      </CardContent>
      {children}
    </Card>
  );
}

/** Le principal d'abord, les autres dans l'ordre servi par l'API. */
function byPrimary(contacts: Contact[]): Contact[] {
  return [...contacts.filter((c) => c.is_primary), ...contacts.filter((c) => !c.is_primary)];
}

/**
 * Corriger, définir comme principal, supprimer — et la boîte de saisie.
 *
 * Définir comme principal n'envoie que `is_primary` : le serveur retire
 * lui-même la marque à l'ancien (`ClearPrimaryContact`), il n'y en a jamais
 * deux.
 */
function useContactGestures({ customerId, canWrite, onChanged }: ListProps) {
  /** `undefined` fermé, `null` nouveau, un interlocuteur corrigé sinon. */
  const [editing, setEditing] = useState<Contact | null | undefined>(undefined);
  const remove = useAction((id: string) => api.deleteContact(id));
  const promote = useAction((id: string) => api.updateContact(id, { is_primary: true }));

  async function retirer(contact: Contact) {
    const ok = await askConfirm({
      title: `Supprimer ${contact.full_name}`,
      description: "L'interlocuteur et ses coordonnées quittent la fiche, définitivement.",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    // `!== null` : la route rend 204 sans corps, donc `undefined` en cas de succès.
    if ((await remove.run(contact.id)) !== null) onChanged();
  }

  async function principal(contact: Contact) {
    if ((await promote.run(contact.id)) !== null) onChanged();
  }

  const gestures = (contact: Contact): ContactGestures =>
    canWrite
      ? {
          onEdit: () => setEditing(contact),
          onRemove: () => void retirer(contact),
          onMakePrimary: () => void principal(contact),
          busy: remove.pending || promote.pending,
        }
      : {};

  const dialog =
    editing === undefined ? null : (
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
    );

  return { gestures, dialog, openNew: () => setEditing(null) };
}
