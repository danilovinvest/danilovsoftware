"use client";

import { memo, useState } from "react";
import { BanknoteIcon, FileTextIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { PreviewLink } from "@/modules/files";
import { ClaudeButton, quoteContext } from "@/modules/assistant";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/ui/feedback";
import { formatAmount, formatDate } from "@/shared/lib/format";
import { askConfirm } from "@/shared/ui/confirm";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import { PAYMENT_STATUS, QUOTE_ISSUER, QUOTE_KIND, QUOTE_STATUS } from "../lib/labels";
import { revisions } from "../lib/cycle";
import { useAction } from "../hooks/use-customers";
import { EnumBadge } from "./enum-badge";
import { QuoteDialog } from "./quote-dialog";
import { QuotePayments } from "./quote-payments";
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
  onChanged,
}: {
  quotes: Quote[];
  /** Les virements de toute la fiche : chaque ligne y prend les siens. */
  payments: QuotePayment[];
  /** La pièce qui porte le règlement de l'affaire : la seule où il s'écrit. */
  carrierId: string | null;
  /** Ouvre l'éditeur des règlements de l'affaire — le même que partout. */
  onSettle?: (kind: "acompte" | "solde") => void;
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
              <span className="font-mono text-xs">{quote.reference || quote.label || "Devis"}</span>
              {/* La société qui émet : sur une même affaire, l'étude est à
                  STRUCTURE et les travaux à GROUPE, et la référence seule ne le
                  dit pas — les deux numérotent chacune de leur côté. */}
              {quote.issuer && (
                <EnumBadge value={quote.issuer} entries={QUOTE_ISSUER} />
              )}
              <EnumBadge value={quote.kind} entries={QUOTE_KIND} />
              <EnumBadge value={quote.status} entries={QUOTE_STATUS} />

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

              <span className="text-muted-foreground text-xs">{formatDate(quote.issued_at)}</span>

              <span className="ml-auto flex items-center gap-2">
                {delta !== 0 && (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      delta < 0 ? "text-success" : "text-warning",
                    )}
                    title={`Écart avec ${previous?.reference || "le devis précédent"}`}
                  >
                    {delta > 0 ? "+" : ""}
                    {Math.round(delta).toLocaleString("fr-FR")} €
                  </span>
                )}
                <span className="text-sm font-medium tabular-nums">
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
              </span>

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

              {/*
                Un devis peut être faux : deux fois le même repris d'un dossier
                OneDrive, un montant lu de travers, une référence attribuée à la
                mauvaise affaire. On le corrige ou on le supprime ici, à la ligne
                où on le voit.
              */}
              {canWrite && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-muted-foreground/50 hover:text-foreground -my-1"
                  aria-label="Modifier le devis"
                  onClick={() => setEditing(quote)}
                >
                  <PencilIcon />
                </Button>
              )}
              {canDelete && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-muted-foreground/50 hover:text-danger -my-1"
                  aria-label="Supprimer le devis"
                  disabled={remove.pending}
                  onClick={async () => {
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
                  }}
                >
                  <Trash2Icon />
                </Button>
              )}
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
    </>
  );
});

/*
  Une facture se reconnaît à sa référence, et `kind` ne peut pas servir : la
  copie OneDrive pose `travaux` sur toutes les pièces qu'elle crée, factures
  comprises. Le serveur tient la même règle en SQL — `est_facture`, migration 59.
*/
function estFacture(quote: Quote): boolean {
  return quote.reference.toUpperCase().startsWith("FA");
}

function amount(quote: Quote): number {
  const raw = quote.amount_ttc ?? quote.amount_ht;
  const value = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isNaN(value) ? 0 : value;
}
