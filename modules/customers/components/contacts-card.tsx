"use client";

import { useState } from "react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { TextField } from "@/shared/ui/field";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { Modal } from "@/shared/ui/modal";
import { Badge } from "@/shared/ui/badge";
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
    <Card>
      <CardHeader
        title="Interlocuteurs"
        description="Plusieurs contacts par fiche : architecte, client final, syndic…"
        action={
          canWrite && (
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              Ajouter
            </Button>
          )
        }
      />

      {contacts.length === 0 ? (
        <EmptyState title="Aucun interlocuteur enregistré" />
      ) : (
        <ul className="divide-y divide-border-subtle">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {contact.full_name}
                  {contact.is_primary && <Badge tone="accent">Principal</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[contact.role_label, contact.email, contact.phone && formatPhone(contact.phone)]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              {canWrite && (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={remove.pending}
                  onClick={async () => {
                    await remove.run(contact.id);
                    onChanged();
                  }}
                >
                  Supprimer
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        title="Nouvel interlocuteur"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button form="contact-form" type="submit" loading={create.pending}>
              Ajouter
            </Button>
          </>
        }
      >
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
          <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
            <input
              type="checkbox"
              checked={values.is_primary}
              onChange={(event) =>
                setValues({ ...values, is_primary: event.target.checked })
              }
            />
            Contact principal de la fiche
          </label>
        </form>
      </Modal>
    </Card>
  );
}
