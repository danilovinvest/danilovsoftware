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
import { formatAmount, formatDate } from "@/shared/lib/format";
import { setPaymentBankAccount } from "../lib/receipts-api";
import { useAction } from "../hooks/use-customers";
import { BankAccountSelect } from "./bank-account-select";
import type { QuotePayment } from "../lib/types";

/**
 * Le compte crédité d'un virement déjà saisi (migration 104). Il appartient
 * au virement et non à la pièce : le corriger le corrige sur toutes ses
 * lignes, parts en attente comprises — le montant, lui, ne bouge pas.
 */
export function PaymentAccountDialog({
  payment,
  onClose,
  onSaved,
}: {
  payment: QuotePayment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [account, setAccount] = useState<string | null>(payment.bank_account_id);
  const save = useAction(setPaymentBankAccount, { inline: true });

  async function submit() {
    if ((await save.run(payment.id, account)) === null) return;
    onSaved();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Compte crédité</DialogTitle>
          <DialogDescription>
            Virement du {formatDate(payment.paid_at)}, {formatAmount(payment.amount)}. Le compte
            vaut pour tout le virement.
          </DialogDescription>
        </DialogHeader>
        {save.error && <ErrorNotice message={save.error} />}
        <BankAccountSelect value={account} onChange={setAccount} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={save.pending} onClick={() => void submit()}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
