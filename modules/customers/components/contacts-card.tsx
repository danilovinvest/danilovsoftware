"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TextField } from "@/shared/ui/form";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { formatPhone } from "@/shared/lib/format";
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
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ContactPayload>(EMPTY);

  const create = useAction((payload: ContactPayload) =>
    api.createContact(customerId, payload),
  );
  const remove = useAction((id: string) => api.deleteContact(id));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!(await create.run(values))) return;
    setValues(EMPTY);
    setOpen(false);
    onChanged();
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-sm">Interlocuteurs</CardTitle>
        <CardDescription className="text-xs">
          Architecte, client final, syndic…
        </CardDescription>
        {canWrite && (
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
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
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {contact.full_name}
                  {contact.is_primary && <Badge variant="secondary">Principal</Badge>}
                </p>
                <p className="text-muted-foreground text-xs">
                  {[
                    contact.role_label,
                    contact.email,
                    contact.phone && formatPhone(contact.phone),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              {canWrite && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Supprimer ${contact.full_name}`}
                  disabled={remove.pending}
                  onClick={async () => {
                    await remove.run(contact.id);
                    onChanged();
                  }}
                >
                  <Trash2Icon />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel interlocuteur</DialogTitle>
            <DialogDescription>
              Rattaché à cette fiche, en plus du contact principal.
            </DialogDescription>
          </DialogHeader>

          <form id="contact-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {create.error && (
              <div className="sm:col-span-2">
                <ErrorNotice message={create.error} />
              </div>
            )}
            <TextField
              label="Nom complet"
              required
              value={values.full_name}
              error={create.fields.full_name}
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
              value={values.phone}
              onChange={(event) => setValues({ ...values, phone: event.target.value })}
            />
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="contact-primary"
                type="checkbox"
                className="accent-primary size-4"
                checked={values.is_primary}
                onChange={(event) =>
                  setValues({ ...values, is_primary: event.target.checked })
                }
              />
              <Label htmlFor="contact-primary" className="text-muted-foreground text-xs">
                Contact principal de la fiche
              </Label>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button form="contact-form" type="submit" disabled={create.pending}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
