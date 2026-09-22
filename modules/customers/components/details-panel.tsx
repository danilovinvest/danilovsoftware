"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { usePermission } from "@/modules/auth";
import { formatDate } from "@/shared/lib/format";
import * as api from "../lib/api";
import { CUSTOMER_SOURCE } from "../lib/labels";
import { ContactsCard } from "./contacts-card";
import { EnumBadge } from "./enum-badge";
import { ReferrerPicker } from "./referrer-picker";
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
          {(customer.source === "recommandation" || customer.referrer) && (
            <Parrain customer={customer} onChanged={onChanged} />
          )}
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

      {/* Les notes de la fiche sont montées dans l'en-tête (issue 60). */}
    </div>
  );
}

/**
 * « Recommandé par », qui s'écrit à la volée : choisir ou retirer enregistre.
 *
 * Il passe par sa propre route, jamais par le formulaire de la fiche, qui
 * remplace la ligne entière et l'effacerait.
 */
function Parrain({ customer, onChanged }: { customer: CustomerDetail; onChanged: () => void }) {
  const canWrite = usePermission("customers:write");
  const [pending, setPending] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

  async function changer(referrer: Parameters<typeof api.setCustomerReferrer>[1]) {
    setPending(true);
    setEchec(null);
    try {
      await api.setCustomerReferrer(customer.id, referrer);
      onChanged();
    } catch {
      setEchec("Le parrain n'a pas pu être enregistré.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1" data-demo="fiche-parrain">
      <span className="text-muted-foreground text-xs">Recommandé par</span>
      <ReferrerPicker
        value={customer.referrer}
        exclude={customer.id}
        disabled={!canWrite || pending}
        onChange={(referrer) => void changer(referrer)}
      />
      {echec && <p className="text-danger text-[11px]">{echec}</p>}
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
