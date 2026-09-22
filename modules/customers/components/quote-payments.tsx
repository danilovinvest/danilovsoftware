"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAmount, formatDate } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import { useAction } from "../hooks/use-customers";
import { parseAmountInput } from "../lib/amount";
import type { QuotePayment } from "../lib/types";

/**
 * Les virements d'un règlement, un par ligne.
 *
 * « Mettre les virements des acomptes sur plusieurs lignes pour voir les
 * tracking » : un acompte se paie rarement d'un coup — une avance à la
 * signature, le reste à la commande des matériaux — et le devis ne portait
 * qu'un nombre. « 2 400 € encaissés » ne disait ni combien de virements ni
 * quand, ce qui est exactement ce qu'on cherche devant un relevé de banque.
 *
 * **La somme fait autorité dès qu'une ligne existe** : le serveur recopie le
 * total dans le montant du devis, et le CRM n'affiche jamais deux nombres qui
 * pourraient se contredire. Le total est donc rappelé ici, calculé de ce qui
 * est affiché — le voir se faire sous les yeux vaut mieux qu'un chiffre venu
 * d'ailleurs.
 *
 * Ce bloc n'est plus une saisie à part : il vit **dans l'éditeur des
 * règlements** (`deposit-field.tsx`), à côté du montant et du jour, là où l'on
 * encaisse. Ailleurs — sous une pièce qui ne porte pas le règlement — il ne fait
 * que lire. Le bouton de saisie reste replié tant qu'aucun virement n'existe.
 */
export function QuotePayments({
  quoteId,
  kind = "acompte",
  payments,
  canWrite,
  onChanged,
}: {
  quoteId: string;
  /** Le règlement que ces virements composent. */
  kind?: "acompte" | "solde";
  /** Les virements de ce devis et de ce règlement, dans l'ordre du relevé. */
  payments: QuotePayment[];
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [saisie, setSaisie] = useState(false);
  const ajouter = useAction(api.addQuotePayment, { inline: true });
  const retirer = useAction(api.removeQuotePayment, { inline: true });
  const enCours = ajouter.pending || retirer.pending;

  if (payments.length === 0 && !canWrite) return null;

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="w-full">
      {payments.length > 0 && (
        <ul className="mb-1 flex flex-col gap-0.5">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="text-muted-foreground flex items-center gap-2 text-xs"
            >
              <span className="tabular-nums">{formatDate(payment.paid_at)}</span>
              <span className="text-foreground font-medium tabular-nums">
                {formatAmount(payment.amount)}
              </span>
              {payment.reference && <span className="truncate">{payment.reference}</span>}
              {canWrite && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="text-muted-foreground/50 hover:text-danger ml-auto"
                  aria-label={`Retirer le virement du ${formatDate(payment.paid_at)}`}
                  disabled={enCours}
                  onClick={async () => {
                    if (await retirer.run(quoteId, payment.id)) onChanged();
                  }}
                >
                  <Trash2Icon />
                </Button>
              )}
            </li>
          ))}
          {/*
            Le total n'apparaît qu'à partir de deux lignes : sous un virement
            unique, il répéterait le montant juste au-dessus.
          */}
          {payments.length > 1 && (
            <li className="text-muted-foreground flex items-center gap-2 text-xs">
              <span>{payments.length} virements</span>
              <span className="text-foreground font-semibold tabular-nums">
                {formatAmount(String(total))}
              </span>
            </li>
          )}
        </ul>
      )}

      {canWrite &&
        (saisie ? (
          <PaymentForm
            kind={kind}
            pending={enCours}
            error={ajouter.error ?? retirer.error}
            onCancel={() => setSaisie(false)}
            onSave={async (input) => {
              if (!(await ajouter.run(quoteId, { ...input, kind }))) return;
              setSaisie(false);
              onChanged();
            }}
          />
        ) : (
          <Button
            size="xs"
            variant="ghost"
            className="text-muted-foreground -ml-1 h-6"
            data-demo="quote-payment-add"
            disabled={enCours}
            onClick={() => setSaisie(true)}
          >
            <PlusIcon />
            {payments.length === 0 ? "Détailler les virements" : "Ajouter un virement"}
          </Button>
        ))}
    </div>
  );
}

/**
 * La saisie d'un virement : la date, le montant, la référence du relevé.
 *
 * Trois champs et pas quatre : la note existe en base et n'a pas d'écran, parce
 * qu'on n'a rien à dire d'un virement qui ne tienne pas dans sa référence. Le
 * jour est **demandé**, jamais posé d'office : c'est celui du relevé, et le jour
 * de la saisie n'en dit rien — on rattrape souvent le relevé de la semaine
 * passée.
 */
function PaymentForm({
  kind,
  pending,
  error,
  onSave,
  onCancel,
}: {
  kind: "acompte" | "solde";
  pending: boolean;
  error: string | null;
  onSave: (input: { paid_at: string; amount: string; reference: string }) => void;
  onCancel: () => void;
}) {
  const [paidAt, setPaidAt] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const parsed = parseAmountInput(amount);
  // `null` — le champ vide — n'est pas une réponse ici : un virement sans
  // montant ne compterait dans aucun total.
  const illisible = parsed === undefined || parsed === null;

  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (illisible || pending || !paidAt) return;
        onSave({ paid_at: paidAt, amount: parsed, reference: reference.trim() });
      }}
    >
      <div className="flex flex-wrap items-center gap-1">
        <Input
          type="date"
          aria-label="Date du virement"
          className="h-7 w-36 text-xs"
          value={paidAt}
          disabled={pending}
          onChange={(event) => setPaidAt(event.target.value)}
        />
        <Input
          autoFocus
          inputMode="decimal"
          placeholder="1 200"
          aria-label="Montant du virement"
          aria-invalid={amount !== "" && illisible ? true : undefined}
          className="h-7 w-24 text-xs tabular-nums"
          value={amount}
          disabled={pending}
          onChange={(event) => setAmount(event.target.value)}
        />
        <Input
          placeholder="Référence du relevé"
          aria-label="Référence du virement"
          className="h-7 w-44 text-xs"
          value={reference}
          disabled={pending}
          onChange={(event) => setReference(event.target.value)}
        />
        <Button type="submit" size="xs" disabled={pending || illisible || !paidAt}>
          Enregistrer
        </Button>
        <Button type="button" size="xs" variant="ghost" disabled={pending} onClick={onCancel}>
          Annuler
        </Button>
      </div>
      <p className={cn("text-[11px]", error ? "text-danger" : "text-muted-foreground")}>
        {error ??
          (paidAt
            ? `Le montant ${kind === "acompte" ? "de l'acompte" : "du solde"} devient la somme de ses virements.`
            : "Le jour du virement, tel qu'il figure sur le relevé.")}
      </p>
    </form>
  );
}
