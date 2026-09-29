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
import { ErrorNotice } from "@/shared/ui/feedback";
import { TextField } from "@/shared/ui/form";
import { todayLocal } from "@/shared/lib/format";
import { parseAmountInput } from "../lib/amount";
import { recordReceipt } from "../lib/receipts-api";
import { useAction } from "../hooks/use-customers";
import { BankAccountSelect } from "./bank-account-select";
import { CustomerPicker } from "./customer-picker";

/**
 * « Encaissement sans facture » (migration 106).
 *
 * « Un virement ne peut pas être saisi sans facture existante » : l'argent
 * arrive souvent avant sa pièce. Il s'inscrit ici tel que le relevé le montre
 * — montant, jour, compte, libellé — et attend son affectation (« Affecter… »).
 * Depuis une fiche, le payeur est la fiche ; depuis « À affecter », il se
 * choisit, ou reste inconnu.
 */
export function ReceiptDialog({
  customer,
  onClose,
  onSaved,
}: {
  /** La fiche qui a payé, quand on l'ouvre depuis elle. */
  customer: { id: string; name: string } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [payer, setPayer] = useState<{ id: string | null; name: string }>(
    customer ?? { id: null, name: "" },
  );
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState(todayLocal);
  const [account, setAccount] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [reference, setReference] = useState("");
  const save = useAction(recordReceipt, { inline: true });
  const parsed = parseAmountInput(amount);
  const invalid = parsed === undefined || parsed === null;

  async function submit() {
    if (invalid || !day) return;
    const ok = await save.run({
      total: parsed,
      paid_at: day,
      customer_id: payer.id,
      bank_account_id: account,
      pending_label: label.trim(),
      reference: reference.trim(),
      allocations: [],
    });
    if (ok === null) return;
    onSaved();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-demo="receipt-dialog">
        <DialogHeader>
          <DialogTitle>Encaissement sans facture</DialogTitle>
          <DialogDescription>
            Le virement tel que le relevé le montre. Il attend son affectation à une ou
            plusieurs pièces — rien n&apos;est perdu en attendant.
          </DialogDescription>
        </DialogHeader>
        {save.error && <ErrorNotice message={save.error} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Montant reçu"
            inputMode="decimal"
            placeholder="3 000"
            value={amount}
            required
            autoFocus
            error={amount !== "" && parsed === undefined ? "Un montant en euros." : undefined}
            onChange={(event) => setAmount(event.target.value)}
          />
          <TextField
            label="Reçu le"
            type="date"
            value={day}
            required
            onChange={(event) => setDay(event.target.value)}
          />
        </div>
        <BankAccountSelect value={account} onChange={setAccount} />
        <TextField
          label="Libellé du relevé"
          placeholder="VIR SEPA M. THEUWISSEN"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <TextField
          label="Référence"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
        {!customer && (
          <CustomerPicker
            label="Payeur (facultatif)"
            value={payer.id}
            valueName={payer.name}
            hint="Vide si le relevé ne dit pas qui a payé : l'encaissement attend sans fiche."
            onChange={(id, name) => setPayer({ id, name })}
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={invalid || !day || save.pending} onClick={() => void submit()}>
            Enregistrer en attente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
