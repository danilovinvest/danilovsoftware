"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDirtyGuard } from "@/shared/lib/dirty-guard";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { todayLocal } from "@/shared/lib/format";
import { useAction } from "../hooks/use-customers";
import { amountToInput, parseAmountInput } from "../lib/amount";
import {
  DELIVERY_MODE,
  ORDER_STATUS,
  createOrder,
  updateOrder,
  type DeliveryMode,
  type OrderStatus,
  type SupplierOrder,
} from "../lib/supplier-orders";
import { CustomerPicker } from "./customer-picker";

const STATUSES = Object.entries(ORDER_STATUS).map(([value, { label }]) => ({ value, label }));
const MODES = Object.entries(DELIVERY_MODE).map(([value, label]) => ({ value, label }));

/**
 * Une commande fournisseur, inscrite ou corrigée.
 *
 * Le fournisseur est une fiche — Balitrand, S&P, ArcelorMittal — qu'on cherche
 * ou qu'on crée depuis le sélecteur. Passer le statut à « Commandé » franchit
 * le cran « Matériaux commandés » de l'affaire, et la boîte le dit avant le
 * clic : ce n'est plus à cocher à part.
 */
export function OrderDialog({
  projectId,
  order,
  onClose,
  onSaved,
}: {
  projectId: string;
  order: SupplierOrder | null;
  onClose: () => void;
  onSaved: (next: SupplierOrder[]) => void;
}) {
  const [draft, setDraft] = useState(() => ({
    supplier_id: order?.supplier_id ?? "",
    status: order?.status ?? ("commande" as OrderStatus),
    supplier_reference: order?.supplier_reference ?? "",
    label: order?.label ?? "",
    delivery_mode: order?.delivery_mode ?? ("" as DeliveryMode | ""),
    ordered_at: order?.ordered_at ?? todayLocal(),
    expected_at: order?.expected_at ?? "",
    amount: amountToInput(order?.amount_ht ?? null),
    invoice_reference: order?.invoice_reference ?? "",
    document_url: order?.document_url ?? "",
    note: order?.note ?? "",
  }));
  const [supplierName, setSupplierName] = useState(order?.supplier_name ?? "");
  const [dirty, setDirty] = useState(false);
  const save = useAction(
    (payload: Parameters<typeof createOrder>[1]) =>
      order ? updateOrder(order.id, payload) : createOrder(projectId, payload),
    { inline: true },
  );
  const guard = useDirtyGuard(dirty, (open) => {
    if (!open) onClose();
  });
  const parsed = parseAmountInput(draft.amount);
  const invalid = draft.supplier_id === "" || draft.label.trim() === "" || parsed === undefined;
  const wasFirm = order ? order.status === "commande" || order.status === "livre" : false;
  // La règle du serveur, telle quelle : une commande qui devient ferme.
  const willMark = !wasFirm && (draft.status === "commande" || draft.status === "livre");

  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function submit() {
    if (invalid) return;
    const next = await save.run({
      supplier_id: draft.supplier_id,
      status: draft.status,
      supplier_reference: draft.supplier_reference,
      label: draft.label,
      delivery_mode: draft.delivery_mode,
      invoice_reference: draft.invoice_reference,
      document_url: draft.document_url,
      note: draft.note,
      ordered_at: draft.ordered_at || null,
      expected_at: draft.expected_at || null,
      amount_ht: parsed ?? null,
    });
    if (!next) return;
    onSaved(next);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => void guard(open)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-demo="order-dialog">
        <DialogHeader>
          <DialogTitle>{order ? `Modifier « ${order.label} »` : "Commande fournisseur"}</DialogTitle>
          <DialogDescription>
            À qui, sous quel numéro, pour quand. Le montant hors taxes donne le coût matière de
            l&apos;affaire.
          </DialogDescription>
        </DialogHeader>
        <CustomerPicker
          label="Fournisseur"
          value={draft.supplier_id || null}
          valueName={supplierName}
          placeholder="Chercher le fournisseur…"
          allowCreate
          createAs="fournisseur"
          onChange={(id, name) => {
            set("supplier_id", id ?? "");
            setSupplierName(name);
          }}
        />
        <TextField
          label="Ce qui est commandé"
          placeholder="3 HEA200 · 4,20 m"
          value={draft.label}
          required
          onChange={(event) => set("label", event.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Statut"
            options={STATUSES}
            value={draft.status}
            required
            onValueChange={(value) => set("status", value as OrderStatus)}
          />
          <TextField
            label="N° de devis fournisseur"
            placeholder="DV-118842"
            value={draft.supplier_reference}
            onChange={(event) => set("supplier_reference", event.target.value)}
          />
          <TextField
            label="Commandé le"
            type="date"
            value={draft.ordered_at}
            onChange={(event) => set("ordered_at", event.target.value)}
          />
          <TextField
            label="Montant HT"
            inputMode="decimal"
            value={draft.amount}
            error={draft.amount !== "" && parsed === undefined ? "Un montant en euros." : undefined}
            onChange={(event) => set("amount", event.target.value)}
          />
          <SelectField
            label="Réception"
            options={MODES}
            value={draft.delivery_mode}
            emptyLabel="Non précisée"
            onValueChange={(value) => set("delivery_mode", value as DeliveryMode | "")}
          />
          <TextField
            label={draft.delivery_mode === "retrait" ? "Retrait prévu le" : "Livraison prévue le"}
            type="date"
            value={draft.expected_at}
            onChange={(event) => set("expected_at", event.target.value)}
          />
          <TextField
            label="N° de facture fournisseur"
            value={draft.invoice_reference}
            onChange={(event) => set("invoice_reference", event.target.value)}
          />
          <TextField
            label="Lien du document"
            placeholder="Lien OneDrive ou SharePoint"
            value={draft.document_url}
            onChange={(event) => set("document_url", event.target.value)}
          />
        </div>
        <TextAreaField
          label="Note"
          placeholder="Interlocuteur au dépôt, créneau de livraison…"
          value={draft.note}
          onChange={(event) => set("note", event.target.value)}
        />
        {willMark && (
          <p className="text-muted-foreground text-xs">
            Enregistrer ajoute cet article aux matériaux commandés de l&apos;affaire, et franchit le
            cran au jour de la commande s&apos;il ne l&apos;est pas déjà.
          </p>
        )}
        {/* Près du bouton : en haut d'une boîte qui défile, un refus ne se verrait pas. */}
        {save.error && <ErrorNotice message={save.error} />}
        <DialogFooter>
          <Button variant="outline" onClick={() => void guard(false)}>
            Annuler
          </Button>
          <Button disabled={invalid || save.pending} onClick={() => void submit()}>
            {save.pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
