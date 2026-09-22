"use client";

import { useState } from "react";
import { useDirtyGuard } from "@/shared/lib/dirty-guard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TextAreaField, TextField } from "@/shared/ui/form";
import { ErrorNotice } from "@/shared/ui/feedback";
import * as api from "../lib/api";
import { useAction } from "../hooks/use-customers";
import type { Contact, ContactPayload } from "../lib/types";

const EMPTY: ContactPayload = {
  full_name: "",
  role_label: "",
  email: "",
  phone: "",
  is_primary: false,
  notes: "",
};

function toPayload(contact: Contact): ContactPayload {
  return {
    full_name: contact.full_name,
    role_label: contact.role_label,
    email: contact.email,
    phone: contact.phone,
    is_primary: contact.is_primary,
    notes: contact.notes,
  };
}

/** Les seuls champs touchés : la route garde le reste (issue 60). */
function changed(initial: ContactPayload, values: ContactPayload): Partial<ContactPayload> {
  const keys = Object.keys(values) as (keyof ContactPayload)[];
  return Object.fromEntries(
    keys.filter((key) => values[key] !== initial[key]).map((key) => [key, values[key]]),
  ) as Partial<ContactPayload>;
}

/**
 * Un interlocuteur, créé ou corrigé.
 *
 * Corriger un numéro obligeait à supprimer puis recréer (issue 60) : la route
 * `PATCH /v1/contacts/{id}` existait, aucun écran ne l'appelait. La boîte part
 * d'un état neuf à chaque ouverture — l'appelant la remonte par une `key`.
 */
export function ContactDialog({
  customerId,
  contact = null,
  open,
  onOpenChange,
  onSaved,
}: {
  customerId: string;
  /** Présent, on le corrige au lieu d'en créer un. */
  contact?: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [initial] = useState<ContactPayload>(() => (contact ? toPayload(contact) : EMPTY));
  const [values, setValues] = useState<ContactPayload>(initial);
  const close = useDirtyGuard(JSON.stringify(values) !== JSON.stringify(initial), onOpenChange);
  const save = useAction(
    () =>
      contact
        ? api.updateContact(contact.id, changed(initial, values))
        : api.createContact(customerId, values),
    { inline: true },
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!(await save.run())) return;
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contact ? `Modifier ${contact.full_name}` : "Nouvel interlocuteur"}</DialogTitle>
          <DialogDescription>
            Rattaché à cette fiche, en plus du contact principal.
          </DialogDescription>
        </DialogHeader>

        <form id="contact-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {save.error && (
            <div className="sm:col-span-2">
              <ErrorNotice message={save.error} />
            </div>
          )}
          <TextField
            label="Nom complet"
            required
            value={values.full_name}
            error={save.fields.full_name}
            onChange={(event) => setValues({ ...values, full_name: event.target.value })}
          />
          <TextField
            label="Rôle"
            placeholder="Architecte, propriétaire…"
            value={values.role_label}
            onChange={(event) => setValues({ ...values, role_label: event.target.value })}
          />
          <TextField
            label="E-mail"
            type="email"
            value={values.email}
            onChange={(event) => setValues({ ...values, email: event.target.value })}
          />
          <TextField
            label="Téléphone"
            type="tel"
            value={values.phone}
            onChange={(event) => setValues({ ...values, phone: event.target.value })}
          />
          <TextAreaField
            label="Notes"
            wrapperClassName="sm:col-span-2"
            className="min-h-16"
            placeholder="Joignable le matin, passe par la gardienne…"
            value={values.notes}
            onChange={(event) => setValues({ ...values, notes: event.target.value })}
          />
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="contact-primary"
              type="checkbox"
              className="accent-primary size-4"
              checked={values.is_primary}
              onChange={(event) => setValues({ ...values, is_primary: event.target.checked })}
            />
            <Label htmlFor="contact-primary" className="text-muted-foreground text-xs">
              Contact principal de la fiche
            </Label>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Annuler
          </Button>
          <Button form="contact-form" type="submit" disabled={save.pending}>
            {contact ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
