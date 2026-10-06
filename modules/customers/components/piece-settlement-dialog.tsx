"use client";

import * as api from "../lib/api";
import { useAction } from "../hooks/use-customers";
import type { Quote, QuotePayment } from "../lib/types";
import { depositTotalOf, SettlementDialog } from "./deposit-field";

/**
 * L'encaissé d'une pièce qui ne porte pas le règlement de l'affaire (29/09).
 *
 * « Montant encaissé hérité de l'import non modifiable » : Anisimova affichait
 * 12 954,20 € encaissés pour 10 724,20 € réels. Le devis DE2025-0578 portait,
 * depuis la reprise, un acompte de 9 724,20 € **et un solde de 3 230,00 €**
 * marqués reçus — et l'éditeur des règlements ne s'ouvre que sur la pièce
 * porteuse, devenue la facture. Le solde hérité ne s'affichait nulle part sur
 * la ligne, et rien ne permettait de le corriger ni de le retirer.
 *
 * Toute pièce qui porte un règlement s'ouvre désormais dans **le même éditeur**,
 * depuis le « … » de sa ligne. « Retirer » y rend le règlement sans objet (et
 * efface son montant) : un chiffre hérité à tort n'est pas un règlement attendu.
 */
export function PieceSettlementDialog({
  quote,
  kind,
  payments,
  canWrite,
  onClose,
  onChanged,
}: {
  quote: Quote;
  kind: "acompte" | "solde";
  payments: QuotePayment[];
  canWrite: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const acompte = kind === "acompte";
  const write = useAction(
    (status: Quote["deposit_status"], amount: string | null, paidAt?: string) =>
      (acompte ? api.setQuoteDeposit : api.setQuoteBalance)(quote.id, {
        status,
        amount,
        paid_at: paidAt,
      }),
  );

  async function run(status: Quote["deposit_status"], amount: string | null, paidAt?: string) {
    const ok = (await write.run(status, amount, paidAt)) !== null;
    if (ok) onChanged();
    return ok;
  }

  return (
    <SettlementDialog
      open
      onOpenChange={(open) => !open && onClose()}
      kind={kind}
      amount={(acompte ? quote.deposit_amount : quote.balance_amount) ?? null}
      paidAt={(acompte ? quote.deposit_paid_at : quote.balance_paid_at) ?? null}
      paid={(acompte ? quote.deposit_status : quote.balance_status) === "recu"}
      total={depositTotalOf(quote)}
      transfers={{
        quoteId: quote.id,
        payments: payments.filter((p) => p.quote_id === quote.id && p.kind === kind),
        canWrite,
        onChanged,
      }}
      pending={write.pending}
      onSave={(amount, paidAt) => run("recu", amount, paidAt)}
      onRemove={() => run("non_applicable", null)}
    />
  );
}
