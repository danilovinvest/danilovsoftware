"use client";

import { memo, useState } from "react";
import {
  ArrowRightLeftIcon,
  BanknoteIcon,
  FileMinusIcon,
  FileTextIcon,
  ReceiptIcon,
  ScaleIcon,
} from "lucide-react";
import { usePermission } from "@/modules/auth";
import { PreviewLink } from "@/modules/files";
import { ClaudeButton, quoteContext } from "@/modules/assistant";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/shared/ui/feedback";
import { formatAmount, formatDate } from "@/shared/lib/format";
import { askConfirm } from "@/shared/ui/confirm";
import * as api from "../lib/api";
import { PAYMENT_STATUS, QUOTE_KIND, QUOTE_STATUS } from "../lib/labels";
import { revisions } from "../lib/cycle";
import { settledKinds } from "../lib/settlement";
import { pieceRefText } from "../lib/piece-ref";
import { canIssueCreditNote } from "../lib/credit-notes";
import { useAction } from "../hooks/use-customers";
import { CreditNoteDialog } from "./credit-note-dialog";
import { DunningDialog } from "./dunning-dialog";
import { EnumBadge } from "./enum-badge";
import { MoveQuoteDialog, type MoveTarget } from "./move-quote-dialog";
import { PieceRef } from "./piece-ref";
import { PieceSettlementDialog } from "./piece-settlement-dialog";
import { QuoteAmount } from "./quote-amount";
import { QuoteDialog } from "./quote-dialog";
import { QuotePayments } from "./quote-payments";
import { RowMenu } from "./row-menu";
import type { Quote, QuotePayment } from "../lib/types";

// ---------------------------------------------------------------------------
// Les devis, et la négociation qui s'y lit
// ---------------------------------------------------------------------------

/**
 * La liste des devis, du plus ancien au plus récent.
 *
 * L'ordre chronologique n'est pas cosmétique : c'est ainsi qu'on voit la
 * négociation. Deux devis de même nature à trois semaines d'écart, le second
 * moins cher, racontent une remise — l'écart est affiché, parce que c'est lui
 * qu'on cherche.
 */
export const QuoteList = memo(function QuoteList({
  quotes,
  payments,
  carrierId,
  onSettle,
  moveTargets = [],
  payerName = "",
  onChanged,
}: {
  quotes: Quote[];
  /** Les virements de toute la fiche : chaque ligne y prend les siens. */
  payments: QuotePayment[];
  /** La pièce qui porte le règlement de l'affaire : la seule où il s'écrit. */
  carrierId: string | null;
  /** Ouvre l'éditeur des règlements de l'affaire — le même que partout. */
  onSettle?: (kind: "acompte" | "solde") => void;
  /** Les autres affaires vivantes de la fiche, où une pièce peut être déplacée. */
  moveTargets?: MoveTarget[];
  /** Qui règle l'affaire à la place de la fiche (migration 107), vide sinon. */
  payerName?: string;
  onChanged: () => void;
}) {
  const canDelete = usePermission("quotes:delete");
  const canWrite = usePermission("quotes:write");
  const remove = useAction((id: string) => api.deleteQuote(id));
  /*
    Le devis qu'on corrige.

    Trois sources ont peuplé le CRM sans se connaître — le classeur, l'export de
    devis, les deux arborescences OneDrive — et un devis repris de l'une d'elles
    peut porter une référence, un montant, une date ou une société à corriger.
    On ne pouvait que le supprimer, ce qui perdait aussi ce qu'il avait de juste.
  */
  const [editing, setEditing] = useState<Quote | null>(null);
  // Déplacer une pièce, corriger l'encaissé hors de la pièce porteuse (29/09).
  const [moving, setMoving] = useState<Quote | null>(null);
  const [settling, setSettling] = useState<{ quote: Quote; kind: "acompte" | "solde" } | null>(null);
  // L'avoir qu'on émet sur une facture (migration 105).
  const [crediting, setCrediting] = useState<Quote | null>(null);
  // L'échelle de recouvrement d'une facture due (migration 109).
  const [dunning, setDunning] = useState<Quote | null>(null);

  async function supprimer(quote: Quote) {
    const nom = quote.reference || quote.label || "ce devis";
    const ok = await askConfirm({
      title: `Supprimer le devis « ${nom} »`,
      description: quote.drive_url
        ? "Son PDF est encore dans OneDrive : la copie suivante le recréera. Supprimer d'abord le fichier, ou corriger le devis."
        : "Il n'a pas de document : sa suppression est définitive.",
      confirmLabel: "Supprimer le devis",
    });
    if (!ok) return;
    if ((await remove.run(quote.id)) !== null) onChanged();
  }

  if (quotes.length === 0) {
    return (
      <EmptyState
        title="Aucun devis"
        description="L'étude, les sondages et les travaux se chiffrent ici, un devis par lot."
      />
    );
  }

  const ordered = revisions(quotes);

  return (
    <>
      <ul className="divide-y">
        {ordered.map((quote, index) => {
          /*
            Une révision se compare à la pièce de **même nature**. `kind` n'y
            suffit pas — il vaut `travaux` sur tout ce que la copie OneDrive
            crée, factures comprises — si bien qu'une facture d'acompte de
            5 000 € rangée sous un devis de 10 000 € s'affichait « révision 2,
            −5 000 € ». Invisible tant qu'une seule facture portait un montant,
            systématique dès que la lecture des PDF les peuple.
          */
          const memeNature = (other: Quote) =>
            other.kind === quote.kind && estFacture(other) === estFacture(quote);
          const previous = ordered.slice(0, index).filter(memeNature).at(-1);
          const delta = previous ? amount(quote) - amount(previous) : 0;
          const revision = previous ? ordered.slice(0, index).filter(memeNature).length + 1 : 0;

          return (
            <li key={quote.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              {/* La société en lettre devant le numéro (G, S) : les deux
                  numérotent chacune de leur côté. */}
              <PieceRef issuer={quote.issuer} reference={quote.reference} fallback={quote.label || "Devis"} />
              <EnumBadge value={quote.kind} entries={QUOTE_KIND} />
              <EnumBadge value={quote.status} entries={QUOTE_STATUS} />
              {payerName && estFacture(quote) && (
                <span data-demo="invoice-payer" className="text-xs font-medium">
                  payée par {payerName}
                </span>
              )}

              {revision > 1 && (
                <span className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]">
                  révision {revision}
                </span>
              )}

              {quote.deposit_status !== "non_applicable" && (
                <span className="text-muted-foreground text-xs">
                  acompte {PAYMENT_STATUS[quote.deposit_status].label.toLowerCase()}
                  {/* Le jour réel, quand on le connaît : c'est lui qu'on
                      rapproche du relevé (issue 114). */}
                  {quote.deposit_status === "recu" &&
                    quote.deposit_paid_at &&
                    ` le ${formatDate(quote.deposit_paid_at)}`}
                  {quote.deposit_amount && ` · ${formatAmount(quote.deposit_amount)}`}
                </span>
              )}

              {/* Le solde aussi : un solde hérité de la reprise comptait dans
                  l'encaissé de l'affaire sans jamais se montrer (Anisimova). */}
              {quote.balance_status !== "non_applicable" && (
                <span className="text-muted-foreground text-xs" data-demo="quote-balance-line">
                  solde {PAYMENT_STATUS[quote.balance_status].label.toLowerCase()}
                  {quote.balance_status === "recu" &&
                    quote.balance_paid_at &&
                    ` le ${formatDate(quote.balance_paid_at)}`}
                  {quote.balance_amount && ` · ${formatAmount(quote.balance_amount)}`}
                </span>
              )}

              <span className="text-muted-foreground text-xs">{formatDate(quote.issued_at)}</span>

              <QuoteAmount
                quote={quote}
                quotes={quotes}
                delta={delta}
                previousRef={previous?.reference || "le devis précédent"}
              />

              {/*
                Le devis lui-même, quand la copie OneDrive en connaît l'adresse.
                Le fichier n'est pas dans le CRM : le lien l'ouvre chez Microsoft,
                et c'est ce qui évite de faire entrer trois cents PDF en base.
              */}
              {/* Lire la pièce : c'est là que dorment montants et acomptes. */}
              <ClaudeButton
                size="xs"
                iconOnly
                context={quoteContext({
                  id: quote.id,
                  project: quote.project_label,
                  projectId: quote.project_id,
                  reference: quote.reference,
                  kind: QUOTE_KIND[quote.kind].label,
                  document: quote.drive_name,
                  amount: quote.amount_ttc
                    ? `${formatAmount(quote.amount_ttc)} TTC`
                    : quote.amount_ht
                      ? `${formatAmount(quote.amount_ht)} HT`
                      : null,
                  invoice: estFacture(quote),
                })}
              />
              {/*
                Un devis peut être faux : deux fois le même repris d'un dossier
                OneDrive, un montant lu de travers, une référence attribuée à la
                mauvaise affaire. On le corrige ou on le supprime ici, à la ligne
                où on le voit — par un seul menu, là où un crayon et une
                corbeille se touchaient.
              */}
              <RowMenu
                label={`Actions sur ${quote.reference || quote.label || "le devis"}`}
                demo="quote-menu"
                disabled={remove.pending}
                onEdit={canWrite ? () => setEditing(quote) : undefined}
                editLabel="Modifier le devis…"
                onDelete={canDelete ? () => void supprimer(quote) : undefined}
                deleteLabel="Supprimer le devis…"
              >
                {canWrite && (
                  <DropdownMenuItem onSelect={() => setMoving(quote)} data-demo="quote-move">
                    <ArrowRightLeftIcon />
                    Déplacer vers une autre affaire…
                  </DropdownMenuItem>
                )}
                {canWrite && canIssueCreditNote(quote) && (
                  <DropdownMenuItem onSelect={() => setCrediting(quote)} data-demo="quote-credit-note">
                    <FileMinusIcon />
                    Émettre un avoir…
                  </DropdownMenuItem>
                )}
                {/* Une facture due se relance : la même pièce qu'un avoir peut réduire. */}
                {canIssueCreditNote(quote) && (
                  <DropdownMenuItem onSelect={() => setDunning(quote)} data-demo="quote-dunning">
                    <ScaleIcon />
                    Recouvrement…
                  </DropdownMenuItem>
                )}
                {canWrite &&
                  quote.id !== carrierId &&
                  settledKinds(quote).map((kind) => (
                    <DropdownMenuItem
                      key={kind}
                      onSelect={() => setSettling({ quote, kind })}
                      data-demo="quote-settlement-fix"
                    >
                      <ReceiptIcon />
                      {kind === "acompte"
                        ? "Corriger l'acompte de cette pièce…"
                        : "Corriger le solde de cette pièce…"}
                    </DropdownMenuItem>
                  ))}
              </RowMenu>
              {quote.drive_url && (
                <PreviewLink
                  url={quote.drive_url}
                  name={quote.drive_name || quote.reference || "Devis"}
                  className="text-muted-foreground hover:border-primary/40 flex w-full min-w-0 gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-xs transition-colors"
                >
                  <FileTextIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{quote.drive_name || "Ouvrir le devis"}</span>
                </PreviewLink>
              )}

              {quote.comment && (
                <p className="text-muted-foreground w-full text-xs">{quote.comment}</p>
              )}

              {/*
                Les règlements de l'affaire s'écrivent sur une seule pièce, celle
                que `paymentCarrier` désigne, et par un seul éditeur — le même que
                la frise, « à faire maintenant » et l'après-signature. Les
                virements s'y saisissent ; ici, ils se lisent.
              */}
              {quote.id === carrierId && canWrite && onSettle && (
                <span className="flex items-center gap-1">
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-muted-foreground -my-1 h-6"
                    data-demo="quote-payment-add"
                    title="Montant, jour et virements de l'acompte"
                    onClick={() => onSettle("acompte")}
                  >
                    <BanknoteIcon />
                    Acompte
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-muted-foreground -my-1 h-6"
                    title="Montant, jour et virements du solde"
                    onClick={() => onSettle("solde")}
                  >
                    Solde
                  </Button>
                </span>
              )}
              {(["acompte", "solde"] as const).map((kind) => {
                const lignes = payments.filter(
                  (payment) => payment.quote_id === quote.id && payment.kind === kind,
                );
                if (lignes.length === 0) return null;
                return (
                  <div key={kind} className="w-full pl-1">
                    <span className="text-muted-foreground text-[11px]">Virements · {kind}</span>
                    <QuotePayments
                      quoteId={quote.id}
                      kind={kind}
                      payments={lignes}
                      canWrite={false}
                      onChanged={onChanged}
                    />
                  </div>
                );
              })}
            </li>
          );
        })}
      </ul>

      {/* La boîte vit hors de la liste : une liste ne porte que ses lignes. */}
      <QuoteDialog
        // Remontée à chaque devis : le formulaire part de ce que porte
        // celui-ci, et non de ce que portait le précédent.
        key={editing?.id ?? "quote-closed"}
        project={null}
        quote={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChanged();
        }}
      />
      <MoveQuoteDialog
        key={moving?.id ?? "move-closed"}
        quote={moving}
        targets={moveTargets.filter((target) => target.id !== moving?.project_id)}
        onOpenChange={(open) => !open && setMoving(null)}
        onMoved={onChanged}
      />
      {crediting && (
        <CreditNoteDialog
          invoice={crediting}
          quotes={quotes}
          onClose={() => setCrediting(null)}
          onSaved={onChanged}
        />
      )}
      {dunning && (
        <DunningDialog
          quoteId={dunning.id}
          title={pieceRefText(dunning.issuer, dunning.reference) || dunning.label}
          onClose={() => setDunning(null)}
        />
      )}
      {settling && (
        <PieceSettlementDialog
          quote={settling.quote}
          kind={settling.kind}
          payments={payments}
          canWrite={canWrite}
          onClose={() => setSettling(null)}
          onChanged={onChanged}
        />
      )}
    </>
  );
});

/*
  La nature de la pièce vient du serveur, elle ne se devine plus ici.

  Elle se lisait de la référence, et `kind` ne pouvait pas servir : la copie
  OneDrive pose `travaux` sur toutes les pièces qu'elle crée, factures
  comprises. Le serveur portait la même règle en SQL, donc deux copies d'une
  même vérité qui auraient divergé au premier ajustement. Depuis la
  migration 82, c'est une colonne, et elle voyage avec le devis.
*/
function estFacture(quote: Quote): boolean {
  return quote.piece === "facture";
}

function amount(quote: Quote): number {
  const raw = quote.amount_ttc ?? quote.amount_ht;
  const value = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isNaN(value) ? 0 : value;
}
