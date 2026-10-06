"use client";

import { formatAmount } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { cancelledInvoice, creditNotesOf, isCreditNote, netToPay } from "../lib/credit-notes";
import { pieceRefText } from "../lib/piece-ref";
import type { Quote } from "../lib/types";

/**
 * Le montant d'une pièce, et ce qu'il faut savoir pour le lire : l'écart avec
 * la révision précédente, d'où vient le chiffre, ce que le PDF dit — et depuis
 * le 29/09 ce que les avoirs en retranchent (migration 105) : une facture
 * réduite affiche son **net à payer**, un avoir nomme la facture qu'il annule.
 */
export function QuoteAmount({
  quote,
  quotes,
  delta,
  previousRef,
}: {
  quote: Quote;
  /** Les pièces de l'affaire : les avoirs et leurs factures s'y lisent. */
  quotes: Quote[];
  delta: number;
  previousRef: string;
}) {
  return (
    <span className="ml-auto flex items-center gap-2">
      {delta !== 0 && (
        <span
          className={cn(
            "text-xs tabular-nums",
            delta < 0 ? "text-success" : "text-warning",
          )}
          title={`Écart avec ${previousRef}`}
        >
          {delta > 0 ? "+" : ""}
          {Math.round(delta).toLocaleString("fr-FR")} €
        </span>
      )}
      <span className="text-sm font-medium tabular-nums">
        {/* Un avoir se stocke positif et se lit en déduction. */}
        {isCreditNote(quote) && (quote.amount_ttc || quote.amount_ht) ? "− " : ""}
        {quote.amount_ttc || quote.amount_ht
          ? formatAmount(quote.amount_ttc ?? quote.amount_ht)
          : quote.amount_note || "—"}
      </span>
      {/* D'où vient le chiffre : lu du PDF, l'infobulle montre la
          ligne du document qui l'a justifié. */}
      {quote.amount_source === "pdf" && (
        <span
          data-demo="quote-amount-source"
          title={quote.amount_evidence || "Montant lu dans le PDF du devis"}
          className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]"
        >
          lu du PDF
        </span>
      )}
      {/*
        Ce que le document dit, quand il contredit la saisie.

        Mesuré le 16/09 : quatorze devis sur les quarante-neuf qui
        portaient à la fois une saisie et un PDF — une remise, une
        révision, ou un TTC ramené en HT. Le CRM ne corrige rien : il
        le dit, l'infobulle montre la ligne du document, et la
        décision reste commerciale.
      */}
      {quote.amount_pdf_ht &&
        quote.amount_ht &&
        Math.abs(Number(quote.amount_pdf_ht) - Number(quote.amount_ht)) > 0.01 && (
          <span
            data-demo="quote-amount-divergence"
            title={
              quote.amount_pdf_evidence ||
              "Montant lu dans le PDF, différent de celui saisi"
            }
            className="text-warning bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]"
          >
            le PDF dit {formatAmount(quote.amount_pdf_ht)}
          </span>
        )}
      {quote.amount_read_error && !quote.amount_ht && !quote.amount_ttc && (
        <span className="text-warning text-[0.65rem]" title={quote.amount_read_error}>
          montant illisible
        </span>
      )}
      <CreditBadges quote={quote} quotes={quotes} />
    </span>
  );
}

/** Le net d'une facture réduite par un avoir, ou la facture qu'un avoir annule. */
function CreditBadges({ quote, quotes }: { quote: Quote; quotes: Quote[] }) {
  if (isCreditNote(quote)) {
    const annulee = cancelledInvoice(quote, quotes);
    return (
      <span
        data-demo="quote-credit-cancels"
        className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]"
      >
        avoir{annulee ? ` · annule ${pieceRefText(annulee.issuer, annulee.reference) || annulee.label}` : ""}
      </span>
    );
  }
  if (creditNotesOf(quote, quotes).length === 0) return null;
  const net = netToPay(quote, quotes);
  return (
    <span
      data-demo="quote-credit-net"
      title="TTC moins les avoirs émis sur cette facture"
      className="text-info bg-info-soft rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium"
    >
      net à payer {formatAmount(net)}
    </span>
  );
}
