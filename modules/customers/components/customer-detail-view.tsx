"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { ErrorNotice, Skeleton } from "@/shared/ui/feedback";
import { formatDate, formatPhone } from "@/shared/lib/format";
import { CUSTOMER_KIND, CUSTOMER_SOURCE, CUSTOMER_STATUS } from "../lib/labels";
import { useCustomer } from "../hooks/use-customer";
import { useAction } from "../hooks/use-customers";
import * as api from "../lib/api";
import { ContactsCard } from "./contacts-card";
import { CustomerForm } from "./customer-form";
import { EnumBadge } from "./enum-badge";
import { InteractionsCard } from "./interactions-card";
import { ProjectsCard } from "./projects-card";

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { customer, loading, error, reload } = useCustomer(customerId);
  const [editing, setEditing] = useState(false);

  const canWrite = usePermission("customers:write");
  const canDelete = usePermission("customers:delete");
  const remove = useAction(() => api.deleteCustomer(customerId));

  if (loading && !customer) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !customer) {
    return <ErrorNotice message={error ?? "Fiche introuvable."} />;
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Modifier — {customer.display_name}</h1>
        <CustomerForm
          customer={customer}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/customers" className="text-xs text-muted-foreground hover:text-accent">
          ← Retour aux fiches
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{customer.display_name}</h1>
            <EnumBadge value={customer.status} entries={CUSTOMER_STATUS} />
            <EnumBadge value={customer.kind} entries={CUSTOMER_KIND} />
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {customer.reference}
            {customer.company_name && ` · ${customer.company_name}`}
          </p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Modifier
            </Button>
          )}
          {canDelete && (
            <Button
              variant="danger"
              loading={remove.pending}
              onClick={async () => {
                if (!confirm("Archiver cette fiche ? Elle n'apparaîtra plus dans la liste.")) {
                  return;
                }
                if (await remove.run()) router.push("/customers");
              }}
            >
              Archiver
            </Button>
          )}
        </div>
      </header>

      {remove.error && <ErrorNotice message={remove.error} />}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <ProjectsCard
            customerId={customer.id}
            projects={customer.projects}
            quotes={customer.quotes}
            onChanged={reload}
          />
          <InteractionsCard
            customerId={customer.id}
            interactions={customer.interactions}
            projects={customer.projects}
            onChanged={reload}
          />
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Coordonnées" />
            <CardBody className="flex flex-col gap-3 text-sm">
              <Row label="E-mail">
                {customer.email ? (
                  <a className="text-accent hover:underline" href={`mailto:${customer.email}`}>
                    {customer.email}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Téléphone">
                {customer.phone ? (
                  <a className="text-accent hover:underline" href={`tel:${customer.phone}`}>
                    {formatPhone(customer.phone)}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
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
            </CardBody>
          </Card>

          <ContactsCard
            customerId={customer.id}
            contacts={customer.contacts}
            onChanged={reload}
          />

          {customer.notes && (
            <Card>
              <CardHeader title="Notes" />
              <CardBody>
                <p className="text-sm whitespace-pre-line text-muted-foreground">
                  {customer.notes}
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{children}</span>
    </div>
  );
}
