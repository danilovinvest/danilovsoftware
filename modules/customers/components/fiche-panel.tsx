"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermission } from "@/modules/auth";
import { formatDate } from "@/shared/lib/format";
import * as api from "../lib/api";
import { CUSTOMER_SOURCE } from "../lib/labels";
import { EnumBadge } from "./enum-badge";
import { ReferrerPicker } from "./referrer-picker";
import { ClassificationEditor } from "./classification-card";
import { ContactList } from "./contact-list";
import { ManagementCard } from "./management-card";
import { PaysForCard } from "./pays-for-card";
import { formatSiret } from "../lib/classification";
import type { CustomerDetail } from "../lib/types";

/**
 * Onglet « Fiche » (il s'appelait « Détails ») : ce qu'on consulte de temps en
 * temps, pas tous les jours — et ce qu'on y corrige.
 *
 * Chaque carte porte son propre geste. « Modifier » ouvre le formulaire de la
 * fiche, le même que celui de l'en-tête : le réécrire en champs éditables sur
 * place aurait donné deux saisies de la même ligne, qui auraient divergé au
 * premier champ ajouté. Le classement et le parrain s'écrivent déjà à la volée
 * par leurs propres routes, et le restent.
 *
 * Les interlocuteurs y sont en entier — numéros, adresses, notes de chacun —
 * avec les mêmes gestes que sous le nom du client, qui n'en montre qu'une
 * ligne par personne (`contact-list.tsx`). Les notes de la fiche vivent dans
 * l'en-tête (issue 60).
 */
export function FichePanel({
  customer,
  onChanged,
  onEdit,
}: {
  customer: CustomerDetail;
  onChanged: () => void;
  /** Ouvre le formulaire de la fiche ; absent sans le droit d'écrire. */
  onEdit?: () => void;
}) {
  const canWrite = usePermission("customers:write");
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card className="gap-0 py-0" data-demo="fiche-informations">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-sm">Informations</CardTitle>
          {onEdit && (
            <CardAction>
              <Button
                size="sm"
                variant="outline"
                title="Nom, coordonnées, adresse, source, propriétaire"
                onClick={onEdit}
              >
                <PencilIcon />
                Modifier
              </Button>
            </CardAction>
          )}
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
          <Row label="SIRET">{customer.siret ? formatSiret(customer.siret) : "—"}</Row>
        </CardContent>
      </Card>

      {customer.pays_for && customer.pays_for.projects.length > 0 && (
        <PaysForCard paysFor={customer.pays_for} />
      )}

      <ContactList
        variant="full"
        customerId={customer.id}
        kind={customer.kind}
        contacts={customer.contacts}
        canWrite={canWrite}
        onChanged={onChanged}
      />

      {/*
        Les deux autres axes de la fiche et son syndic — ce que la vue graphe
        lit. La clé remonte l'éditeur quand la fiche relue diffère, pour qu'il
        reparte des valeurs enregistrées plutôt que de sa saisie d'avant.
      */}
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-sm">Classement</CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-sm">
          <ClassificationEditor
            key={`${customer.relation}:${customer.siret}`}
            customer={customer}
            onSaved={onChanged}
          />
        </CardContent>
      </Card>

      {/*
        Une copropriété, ou toute fiche qu'un syndic gère : ses syndics
        successifs, qui la suit, et son circuit de facturation (migration 109).
      */}
      {(customer.kind === "copropriete" || customer.syndic_id !== null) && (
        <ManagementCard customerId={customer.id} syndicId={customer.syndic_id} />
      )}
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
