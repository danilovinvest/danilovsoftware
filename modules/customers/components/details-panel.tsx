"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/shared/lib/format";
import { CUSTOMER_SOURCE } from "../lib/labels";
import { ContactsCard } from "./contacts-card";
import { EnumBadge } from "./enum-badge";
import type { CustomerDetail } from "../lib/types";

/** Onglet « Détails » : ce qu'on consulte de temps en temps, pas tous les jours. */
export function DetailsPanel({
  customer,
  onChanged,
}: {
  customer: CustomerDetail;
  onChanged: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-sm">Informations</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 py-4 text-sm">
          <Row label="Adresse">
            {[customer.address_line, customer.postal_code, customer.city]
              .filter(Boolean)
              .join(", ") || "—"}
          </Row>
          <Row label="Source">
            <EnumBadge value={customer.source} entries={CUSTOMER_SOURCE} />
          </Row>
          <Row label="Demande reçue le">{formatDate(customer.requested_at)}</Row>
          <Row label="Responsable">{customer.owner_name || "Non assigné"}</Row>
          <Row label="Raison sociale">{customer.company_name || "—"}</Row>
        </CardContent>
      </Card>

      <ContactsCard
        customerId={customer.id}
        contacts={customer.contacts}
        onChanged={onChanged}
      />

      {customer.notes && (
        <Card className="gap-0 py-0 lg:col-span-2">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <p className="text-muted-foreground text-sm whitespace-pre-line">
              {customer.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
