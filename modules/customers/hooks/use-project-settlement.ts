"use client";

import * as api from "../lib/api";
import { depositTotalOf, type SettlementEditorProps } from "../components/deposit-field";
import { paymentCarrier } from "../lib/settlement";
import { useAction } from "./use-customers";
import type { PaymentStatus, Quote, QuotePayment } from "../lib/types";

/**
 * Les règlements d'une affaire : ce qu'on écrit, et sur quelle pièce.
 *
 * Tout passe par la pièce que `paymentCarrier` désigne — celle que la frise
 * lit, donc celle qu'on écrit, pour que « retirer l'encaissement » retire bien
 * ce que l'écran montre. L'acompte et le solde ont chacun leur route, qui ne
 * touche qu'eux : un montant omis reste celui que porte déjà le devis, et
 * marquer « facturé » n'efface pas ce qu'on a saisi.
 *
 * Le solde passait autrefois par le devis entier, et `updateQuote` efface la
 * provenance du montant lu dans le PDF dès que les montants diffèrent : solder
 * un devis remettait sa lecture en file. Deux actions distinctes, parce qu'un
 * solde encaissé n'implique pas un acompte, ni l'inverse.
 */
export function useProjectSettlement(
  quotes: Quote[],
  onQuote: ((quote: Quote) => void) | undefined,
  onChanged: () => void,
  /** Les virements de la fiche, et le droit d'en saisir. */
  transfers: { payments: QuotePayment[]; canWrite: boolean },
) {
  const porteur = paymentCarrier(quotes);

  const write = (route: typeof api.setQuoteDeposit, field: "deposit_amount" | "balance_amount") =>
    (status: PaymentStatus, amount?: string | null, paidAt?: string) => {
      if (!porteur) throw new Error("Aucun devis à mettre à jour sur cette affaire.");
      return route(porteur.id, {
        status,
        amount: amount === undefined ? porteur[field] : amount,
        paid_at: paidAt,
      }).then((quote) => {
        // Le cran change tout de suite ; le rechargement complète le reste.
        onQuote?.(quote);
        return quote;
      });
    };

  const setDeposit = useAction(write(api.setQuoteDeposit, "deposit_amount"), { inline: true });
  const setBalance = useAction(write(api.setQuoteBalance, "balance_amount"), { inline: true });

  /** Écrit, recharge sur un succès, et rend la réussite : un panneau ne se ferme que sur elle. */
  async function run(
    action: typeof setDeposit,
    status: PaymentStatus,
    amount?: string | null,
    paidAt?: string,
  ): Promise<boolean> {
    const ok = (await action.run(status, amount, paidAt)) !== null;
    if (ok) onChanged();
    return ok;
  }

  const encaisser = (amount: string | null, paidAt?: string) =>
    run(setDeposit, "recu", amount, paidAt);
  const retirerAcompte = () => run(setDeposit, "en_attente");
  const solder = (amount: string | null, paidAt?: string) => run(setBalance, "recu", amount, paidAt);
  const retirerSolde = () => run(setBalance, "en_attente");
  const pending = setDeposit.pending || setBalance.pending;

  /**
   * L'éditeur des règlements, réglé sur la pièce porteuse : le même pour la
   * frise, « à faire maintenant », l'après-signature et la ligne du devis.
   */
  function editorProps(kind: "acompte" | "solde"): SettlementEditorProps {
    const acompte = kind === "acompte";
    return {
      kind,
      amount: (acompte ? porteur?.deposit_amount : porteur?.balance_amount) ?? null,
      // La date réelle, jamais le repli sur l'émission du devis : la préremplir
      // la ferait passer pour un fait.
      paidAt: (acompte ? porteur?.deposit_paid_at : porteur?.balance_paid_at) ?? null,
      paid: (acompte ? porteur?.deposit_status : porteur?.balance_status) === "recu",
      total: depositTotalOf(porteur),
      transfers: porteur
        ? {
            quoteId: porteur.id,
            payments: transfers.payments.filter(
              (payment) => payment.quote_id === porteur.id && payment.kind === kind,
            ),
            canWrite: transfers.canWrite,
            onChanged,
          }
        : undefined,
      pending,
      onSave: acompte ? encaisser : solder,
      onRemove: acompte ? retirerAcompte : retirerSolde,
    };
  }

  return {
    /** La pièce qui porte le règlement, nulle sans devis. */
    porteur,
    setDeposit,
    setBalance,
    /** Encaisse l'acompte avec son montant et son jour, ou les corrige. */
    encaisser,
    /** Retire l'encaissement. Le montant reste sur le devis, le statut repart en attente. */
    retirerAcompte,
    /** L'acompte est facturé, ou — décoché — il n'y en a pas. */
    facturerAcompte: (invoiced: boolean) =>
      run(setDeposit, invoiced ? "en_attente" : "non_applicable"),
    solder,
    retirerSolde,
    editorProps,
    pending,
    error: setDeposit.error ?? setBalance.error,
  };
}
