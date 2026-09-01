"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { ErrorNotice } from "@/shared/ui/feedback";
import * as api from "../lib/api";
import {
  CUSTOMER_KIND,
  CUSTOMER_SOURCE,
  CUSTOMER_STATUS,
  toOptions,
} from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import type { Customer, CustomerPayload } from "../lib/types";

function emptyPayload(): CustomerPayload {
  return {
    display_name: "",
    kind: "particulier",
    status: "prospect",
    source: "site_web",
    company_name: "",
    email: "",
    phone: "",
    address_line: "",
    postal_code: "",
    city: "",
    country: "France",
    requested_at: new Date().toISOString().slice(0, 10),
    notes: "",
    owner_id: null,
  };
}

function toPayload(customer: Customer): CustomerPayload {
  return {
    display_name: customer.display_name,
    kind: customer.kind,
    status: customer.status,
    source: customer.source,
    company_name: customer.company_name,
    email: customer.email,
    phone: customer.phone,
    address_line: customer.address_line,
    postal_code: customer.postal_code,
    city: customer.city,
    country: customer.country,
    requested_at: customer.requested_at,
    notes: customer.notes,
    owner_id: customer.owner_id,
  };
}

export function CustomerForm({
  customer,
  onSaved,
  onCancel,
}: {
  customer?: Customer;
  onSaved?: (saved: Customer) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CustomerPayload>(
    customer ? toPayload(customer) : emptyPayload(),
  );

  const save = useAction(async (payload: CustomerPayload) =>
    customer ? api.updateCustomer(customer.id, payload) : api.createCustomer(payload),
  );

  function set<K extends keyof CustomerPayload>(key: K, value: CustomerPayload[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const saved = await save.run(values);
    if (!saved) return;
    if (onSaved) onSaved(saved);
    else router.push(`/customers/${saved.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {save.error && !Object.keys(save.fields).length && (
        <ErrorNotice message={save.error} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
          <CardDescription>Qui est le client et d&apos;où vient la demande.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nom affiché"
            required
            placeholder="Ex. Alain Cochin, LE BEFORE / Chloé Ballion"
            value={values.display_name}
            error={save.fields.display_name}
            onChange={(event) => set("display_name", event.target.value)}
          />
          <TextField
            label="Raison sociale"
            placeholder="Si société ou syndic"
            value={values.company_name}
            onChange={(event) => set("company_name", event.target.value)}
          />
          <SelectField
            label="Type"
            options={toOptions(CUSTOMER_KIND)}
            value={values.kind}
            error={save.fields.kind}
            onValueChange={(value) => set("kind", value as CustomerPayload["kind"])}
          />
          <SelectField
            label="Statut"
            hint="Un prospect qui signe devient client sans changer de fiche."
            options={toOptions(CUSTOMER_STATUS)}
            value={values.status}
            error={save.fields.status}
            onValueChange={(value) => set("status", value as CustomerPayload["status"])}
          />
          <SelectField
            label="Source"
            options={toOptions(CUSTOMER_SOURCE)}
            value={values.source}
            error={save.fields.source}
            onValueChange={(value) => set("source", value as CustomerPayload["source"])}
          />
          <TextField
            label="Date de la demande"
            type="date"
            value={values.requested_at ?? ""}
            error={save.fields.requested_at}
            onChange={(event) => set("requested_at", event.target.value || null)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coordonnées</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="E-mail"
            type="email"
            value={values.email}
            error={save.fields.email}
            onChange={(event) => set("email", event.target.value)}
          />
          <TextField
            label="Téléphone"
            hint="Saisi tel quel : 06 62 46 48 67 ou 04.92.02.82.62"
            value={values.phone}
            onChange={(event) => set("phone", event.target.value)}
          />
          <TextField
            label="Adresse"
            wrapperClassName="sm:col-span-2"
            value={values.address_line}
            onChange={(event) => set("address_line", event.target.value)}
          />
          <TextField
            label="Code postal"
            value={values.postal_code}
            onChange={(event) => set("postal_code", event.target.value)}
          />
          <TextField
            label="Ville"
            value={values.city}
            onChange={(event) => set("city", event.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>
            Contexte libre : contraintes, historique, remarques.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TextAreaField
            value={values.notes}
            onChange={(event) => set("notes", event.target.value)}
            placeholder="Ex. rapport + proposition envoyés, en attente de retour."
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" size="lg" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" size="lg" disabled={save.pending}>
          {customer ? "Enregistrer" : "Créer la fiche"}
        </Button>
      </div>
    </form>
  );
}
