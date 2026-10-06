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
import { formatAmount, todayLocal } from "@/shared/lib/format";
import { amountToInput, parseAmountInput } from "../lib/amount";
import { fromCents, netToPay, toCents } from "../lib/credit-notes";
import { pieceRefText } from "../lib/piece-ref";
import { issueCreditNote } from "../lib/receipts-api";
import { useAction } from "../hooks/use-customers";
import type { Quote } from "../lib/types";

/**
 * « Émettre un avoir… » sur une facture (migration 105).
 *
 * Anisimova : quatre avoirs enchaînés, chacun suivi d'une facture refaite, et
 * l'avoir n'existait pas comme objet — la facture annulée restait due en
 * entier. L'avoir naît ici lié à la facture qu'il annule, dans son affaire et
 * chez sa société ; son montant part de ce que la facture porte encore (un
 * avoir d'annulation), et l'écran dit le net qui restera.
 */
export function CreditNoteDialog({
  invoice,
  quotes,
  onClose,
  onSaved,
}: {
  invoice: Quote;
  /** Les pièces de l'affaire : ses avoirs déjà émis s'y lisent. */
  quotes: Quote[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const net = netToPay(invoice, quotes);
  const [reference, setReference] = useState("AV");
  const [amount, setAmount] = useState(() => amountToInput(net));
  const [day, setDay] = useState(todayLocal);
  const issue = useAction(issueCreditNote, { inline: true });
  const parsed = parseAmountInput(amount);
  const invalid = parsed === undefined || parsed === null || reference.trim().length < 3;
  const after =
    net !== null && parsed ? fromCents((toCents(net) ?? 0) - (toCents(parsed) ?? 0)) : null;
  const nom = pieceRefText(invoice.issuer, invoice.reference) || invoice.label;

  async function submit() {
    if (invalid) return;
    const ok = await issue.run(invoice.id, {
      reference: reference.trim().toUpperCase(),
      amount_ttc: parsed,
      issued_at: day || null,
    });
    if (ok === null) return;
    onSaved();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-demo="credit-note-dialog">
        <DialogHeader>
          <DialogTitle>Émettre un avoir sur {nom}</DialogTitle>
          <DialogDescription>
            L&apos;avoir annule tout ou partie de la facture : son net à payer baisse
            d&apos;autant, dans les impayés comme dans le facturé de l&apos;affaire.
          </DialogDescription>
        </DialogHeader>
        {issue.error && <ErrorNotice message={issue.error} />}
        <TextField
          label="Numéro de l'avoir"
          placeholder="AV2026-0001"
          value={reference}
          required
          autoFocus
          hint="Un avoir se numérote AV… : c'est la référence qui dit ce qu'est la pièce."
          onChange={(event) => setReference(event.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Montant TTC"
            inputMode="decimal"
            value={amount}
            required
            error={amount !== "" && parsed === undefined ? "Un montant en euros." : undefined}
            onChange={(event) => setAmount(event.target.value)}
          />
          <TextField label="Émis le" type="date" value={day} onChange={(event) => setDay(event.target.value)} />
        </div>
        <p className="text-muted-foreground text-xs">
          {net === null
            ? "La facture n'a pas de TTC : rien ne borne l'avoir."
            : `Net à payer aujourd'hui : ${formatAmount(net)}${after !== null ? ` · après l'avoir : ${formatAmount(after)}` : ""}.`}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={invalid || issue.pending} onClick={() => void submit()}>
            Émettre l&apos;avoir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
