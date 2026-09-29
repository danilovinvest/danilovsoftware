"use client";

import { useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/shared/lib/format";
import { CUSTOMER_KIND, CUSTOMER_RELATION, CUSTOMER_STATUS } from "../lib/labels";
import { relationOf } from "../lib/classification";
import { useAction } from "../hooks/use-customers";
import * as api from "../lib/api";
import type { Customer, CustomerDetail, CustomerIssuerChoice, Review } from "../lib/types";
import { CustomerIssuerBadge, ISSUER_CHOICES } from "./customer-issuer";
import { EnumBadge } from "./enum-badge";
import { ClientItems, IssuerItems, ReviewItems } from "./status-menu-items";

/**
 * Le statut de la fiche : une seule zone, un seul menu.
 *
 * L'en-tête portait cinq badges, un bouton « Passer en client » et sa phrase,
 * une seconde phrase pour la société, un badge-menu pour la choisir, et deux
 * cases de relecture sur une troisième ligne — six endroits pour une seule
 * question, « qu'est-ce que cette fiche, et qui l'a décidé ? ». Les badges
 * restent tous visibles, parce qu'on les lit en ouvrant la fiche ; les gestes
 * qui les contredisent passent dans un menu « Statut », que la rangée entière
 * ouvre.
 *
 * Les écritures vivent ici et non dans le menu : son contenu se démonte à la
 * fermeture, et un geste encore en vol perdrait sa réponse. Leurs erreurs
 * passent par le toast de `useAction`, avec « Réessayer ».
 */
export function CustomerStatus({
  customer,
  canWrite,
  onChanged,
}: {
  customer: CustomerDetail;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const client = useAction((next: boolean | null) => api.setCustomerClient(customer.id, next));
  const issuer = useAction((next: CustomerIssuerChoice | null) =>
    api.setCustomerIssuer(customer.id, next),
  );
  const review = useReview(customer);
  const pending = client.pending || issuer.pending || review.pending;

  function afterWrite(result: unknown) {
    if (result !== null) onChanged();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-demo="customer-status"
          aria-label="Statut de la fiche"
          title="Client ou prospect, société, relecture"
          className="hover:bg-muted hover:border-border flex flex-wrap items-center gap-1.5 rounded-md border border-transparent px-1 py-0.5 text-left disabled:opacity-60"
        >
          <StatusBadges customer={customer} review={review.current} />
          <span className="text-muted-foreground flex items-center gap-0.5 text-xs">
            Statut
            <ChevronDownIcon className="size-3" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-1.5">
        <ClientItems
          customer={customer}
          disabled={!canWrite || pending}
          onChoose={(next) => void client.run(next).then(afterWrite)}
        />
        <DropdownMenuSeparator className="my-1.5" />
        <IssuerItems
          customer={customer}
          disabled={!canWrite || pending}
          onChoose={(next) => void issuer.run(next).then(afterWrite)}
        />
        <DropdownMenuSeparator className="my-1.5" />
        <ReviewItems
          review={review.current}
          disabled={!canWrite || pending}
          onToggle={review.toggle}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * La relecture se coche sans recharger la fiche : la réponse du serveur suffit.
 * Elle n'est retenue que pour la fiche lue à ce moment-là — une fiche relue
 * apporte sa propre relecture, qui l'emporte.
 */
function useReview(customer: CustomerDetail) {
  const [local, setLocal] = useState<{ base: Review; value: Review } | null>(null);
  const action = useAction((change: { verified?: boolean; completed?: boolean }) =>
    api.setCustomerReview(customer.id, change),
  );
  const current = local && local.base === customer.review ? local.value : customer.review;

  async function toggle(field: "verified" | "completed", next: boolean) {
    const value = await action.run({ [field]: next });
    if (value) setLocal({ base: customer.review, value });
  }

  return { current, pending: action.pending, toggle };
}

/** Les badges, tous visibles : on les lit avant d'agir. */
function StatusBadges({ customer, review }: { customer: Customer; review: Review }) {
  return (
    <>
      <EnumBadge value={customer.status} entries={CUSTOMER_STATUS} />
      {/* Déduit des pièces : une cliente archivée reste une cliente. */}
      {customer.is_client && customer.status !== "client" && (
        <span
          data-demo="customer-is-client"
          title="Déduit de ses pièces : devis signé, facture ou paiement reçu"
          className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-xs font-medium"
        >
          Client
        </span>
      )}
      <EnumBadge value={customer.kind} entries={CUSTOMER_KIND} />
      <RelationBadge customer={customer} />
      <CustomerIssuerBadge customer={customer} />
      {/* La relecture ne se lit plus sur deux cases : un repère suffit, le menu dit qui et quand. */}
      {review.verified_at && <ReviewMark label="Vérifiée" at={review.verified_at} />}
      {review.completed_at && <ReviewMark label="Complète" at={review.completed_at} />}
    </>
  );
}

function ReviewMark({ label, at }: { label: string; at: string }) {
  return (
    <span
      data-demo="customer-review"
      title={`${label} le ${formatDate(at)}`}
      className="text-muted-foreground flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-xs"
    >
      <CheckIcon className="size-3" />
      {label}
    </span>
  );
}

/**
 * Ce que la fiche représente pour nous — le second axe, à côté du type.
 *
 * Déduite du type tant que personne ne tranche, et alors écrite en retrait :
 * une supposition affichée comme un fait se relit comme un fait.
 */
function RelationBadge({ customer }: { customer: Customer }) {
  const relation = relationOf(customer);
  if (relation.deduced) {
    return (
      <span
        className="text-muted-foreground rounded-sm border border-dashed px-1.5 py-0.5 text-xs"
        title="Déduite du type — à confirmer dans l'onglet Fiche"
      >
        {CUSTOMER_RELATION[relation.value].label}
      </span>
    );
  }
  return <EnumBadge value={relation.value} entries={CUSTOMER_RELATION} />;
}

/**
 * Les choix posés à la main, sur une seule ligne discrète.
 *
 * Il y avait deux phrases, une par choix, chacune avec son « laisser … décider ».
 * Le retour vit désormais dans le menu ; reste l'aveu, qui doit se lire sans
 * rien ouvrir : un choix qui contredit les pièces se relit, et on doit savoir
 * qui l'a fait et quand.
 */
export function StatusOverrides({ customer }: { customer: Customer }) {
  const parts: { key: string; text: string }[] = [];
  if (customer.client_override !== null) {
    parts.push({
      key: "client-override",
      text: `${customer.client_override ? "client" : "prospect"}${quandQui(
        customer.client_override_at,
        customer.client_override_by_name,
      )}`,
    });
  }
  if (customer.issuer_override !== null) {
    parts.push({
      key: "customer-issuer-override",
      text: `société ${ISSUER_CHOICES[customer.issuer_override].label}${quandQui(
        customer.issuer_override_at,
        customer.issuer_override_by_name,
      )}`,
    });
  }
  if (parts.length === 0) return null;
  return (
    <p className="text-muted-foreground text-xs" data-demo="status-overrides">
      Choisi à la main :{" "}
      {parts.map((part, index) => (
        <span key={part.key} data-demo={part.key}>
          {index > 0 && " · "}
          {part.text}
        </span>
      ))}
    </p>
  );
}

function quandQui(at: string | null, by: string): string {
  return `${at ? ` le ${formatDate(at)}` : ""}${by ? ` par ${by}` : ""}`;
}
