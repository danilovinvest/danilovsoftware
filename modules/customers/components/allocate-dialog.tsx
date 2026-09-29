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
import { Input } from "@/components/ui/input";
import { LIVE, useCached } from "@/shared/api/cache";
import { ErrorNotice } from "@/shared/ui/feedback";
import { formatAmount, formatDate } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { getCustomer } from "../lib/api";
import { allocationPlan } from "../lib/allocation";
import { canIssueCreditNote, netToPay, toCents, fromCents } from "../lib/credit-notes";
import { pieceRefText } from "../lib/piece-ref";
import { allocateReceipt } from "../lib/receipts-api";
import { useAction } from "../hooks/use-customers";
import { CustomerPicker } from "./customer-picker";
import type { PaymentPart } from "../lib/receipt-types";
import type { Quote } from "../lib/types";

/** Les pièces qu'un virement peut régler : factures vivantes, puis devis signés. */
function payablePieces(quotes: Quote[]): Quote[] {
  const factures = quotes.filter(canIssueCreditNote);
  const devis = quotes.filter(
    (q) => q.piece === "devis" && (q.status === "accepte" || q.status === "realise"),
  );
  return [...factures, ...devis];
}

/** Ce qui reste dû sur une pièce : son net moins ce qu'elle a déjà reçu. */
function dueOf(quote: Quote, quotes: Quote[]): string | null {
  const net = netToPay(quote, quotes);
  if (net === null) return null;
  return fromCents((toCents(net) ?? 0) - (toCents(quote.balance_amount) ?? 0));
}

/**
 * « Affecter… » un encaissement en attente (migration 106).
 *
 * Chaque pièce dit sa part, tapée à la main : répartir soi-même serait deviner
 * — un virement dépasse souvent le reste dû de quelques dizaines d'euros, et
 * aucune règle ne sait quoi en faire. Ce qui n'est pas affecté reste en
 * attente, et l'écran dit combien avant le clic.
 */
export function AllocateDialog({
  part,
  onClose,
  onDone,
}: {
  part: PaymentPart;
  onClose: () => void;
  onDone: () => void;
}) {
  const [payer, setPayer] = useState<{ id: string | null; name: string }>({
    id: part.customer_id,
    name: part.customer_name,
  });
  const { data, error } = useCached(
    payer.id ? `customers:detail:${payer.id}` : null,
    () => getCustomer(payer.id as string),
    LIVE,
  );
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const allocate = useAction(allocateReceipt, { inline: true });
  const quotes = data?.quotes ?? [];
  const pieces = payablePieces(quotes);
  const plan = allocationPlan(
    part.amount,
    pieces.map((q) => ({ quoteId: q.id, amount: amounts[q.id] ?? "" })),
  );

  async function submit() {
    if (plan.error) return;
    if ((await allocate.run(part.id, plan.parts)) === null) return;
    onDone();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" data-demo="allocate-dialog">
        <DialogHeader>
          <DialogTitle>Affecter {formatAmount(part.amount)}</DialogTitle>
          <DialogDescription>
            Reçu le {formatDate(part.paid_at)}
            {part.bank_account_label && ` sur ${part.bank_account_label}`}
            {part.label && ` — ${part.label}`}. Chaque pièce dit sa part ; le reste attend.
          </DialogDescription>
        </DialogHeader>
        {(allocate.error !== null || error !== undefined) && (
          <ErrorNotice message={allocate.error ?? "Pièces de la fiche illisibles."} />
        )}
        {!part.customer_id && (
          <CustomerPicker
            label="Payeur"
            value={payer.id}
            valueName={payer.name}
            onChange={(id, name) => {
              setPayer({ id, name });
              setAmounts({});
            }}
          />
        )}
        <PieceRows
          pieces={pieces}
          quotes={quotes}
          amounts={amounts}
          loading={payer.id !== null && !data}
          onChange={(id, value) => setAmounts((current) => ({ ...current, [id]: value }))}
        />
        <p className={cn("text-xs", plan.error && plan.parts.length > 0 ? "text-danger" : "text-muted-foreground")}>
          {plan.error && plan.parts.length > 0
            ? plan.error
            : `Reste en attente après affectation : ${formatAmount(plan.remaining)}.`}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={plan.error !== null || allocate.pending} onClick={() => void submit()}>
            Affecter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PieceRows({
  pieces,
  quotes,
  amounts,
  loading,
  onChange,
}: {
  pieces: Quote[];
  quotes: Quote[];
  amounts: Record<string, string>;
  loading: boolean;
  onChange: (id: string, value: string) => void;
}) {
  if (loading) return <p className="text-muted-foreground text-sm">Lecture des pièces…</p>;
  if (pieces.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucune facture ni devis signé à régler sur cette fiche.
      </p>
    );
  }
  return (
    <ul className="flex max-h-72 flex-col divide-y overflow-y-auto">
      {pieces.map((quote) => {
        const due = dueOf(quote, quotes);
        return (
          <li key={quote.id} className="flex items-center gap-2 py-1.5 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {pieceRefText(quote.issuer, quote.reference) || quote.label}
              </span>
              <span className="text-muted-foreground block truncate text-xs">
                {quote.label} · {due === null ? "montant inconnu" : `reste ${formatAmount(due)}`}
              </span>
            </span>
            <Input
              inputMode="decimal"
              aria-label={`Part pour ${quote.reference || quote.label}`}
              placeholder="0"
              className="h-8 w-28 text-right tabular-nums"
              value={amounts[quote.id] ?? ""}
              onChange={(event) => onChange(quote.id, event.target.value)}
            />
          </li>
        );
      })}
    </ul>
  );
}
