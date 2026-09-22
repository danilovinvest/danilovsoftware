"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatAmount } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { amountToInput, parseAmountInput } from "../lib/amount";
import { QuotePayments } from "./quote-payments";
import type { QuotePayment } from "../lib/types";

// Resté importable d'ici : la sous-traitance le lit à cette adresse.
export { parseAmountInput };

/**
 * Ce à quoi l'acompte se compare : le montant du devis, TTC de préférence.
 *
 * Le pourcentage n'est qu'une aide à la lecture — « 2 400 €, soit 30 % » dit
 * d'un coup d'œil qu'on n'a pas tapé un zéro de trop. Il n'est jamais écrit.
 */
export type DepositTotal = { value: string; tax: "TTC" | "HT" };

export function depositTotalOf(quote: {
  amount_ttc: string | null;
  amount_ht: string | null;
} | null): DepositTotal | null {
  if (quote?.amount_ttc) return { value: quote.amount_ttc, tax: "TTC" };
  if (quote?.amount_ht) return { value: quote.amount_ht, tax: "HT" };
  return null;
}

/** Le montant d'un acompte, à côté de sa date. Rien quand on ne le connaît pas. */
export function DepositTag({
  amount,
  className,
}: {
  amount: string | null;
  className?: string;
}) {
  if (!amount) return null;
  return (
    <span className={cn("text-foreground font-semibold tabular-nums", className)}>
      {formatAmount(amount)}
    </span>
  );
}

/**
 * Lequel des deux règlements l'éditeur saisit.
 *
 * Un seul éditeur pour les deux : l'acompte et le solde vivent sur le même
 * devis, se saisissent au même endroit et se corrigent de la même façon. Seuls
 * les mots changent, et ils vivent ici.
 */
export type ReglementKind = "acompte" | "solde";

/**
 * Les virements du règlement, quand l'écran les connaît.
 *
 * La fiche client les a — ils sont servis avec son détail. La fiche latérale
 * d'un chantier ne les a pas : l'éditeur y garde le montant et le jour, sans la
 * liste.
 */
export type SettlementTransfers = {
  /** La pièce qui porte le règlement : celle sur laquelle les virements s'ajoutent. */
  quoteId: string;
  /** Les virements de ce règlement sur cette pièce, dans l'ordre du relevé. */
  payments: QuotePayment[];
  canWrite: boolean;
  onChanged: () => void;
};

/** Le jour local, AAAA-MM-JJ : `toISOString` donnerait la veille après 22 h l'été. */
function aujourdhui(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const REGLEMENT: Record<ReglementKind, { nom: string; bouton: string; sansMontant: string }> = {
  acompte: {
    nom: "L'acompte",
    bouton: "Acompte encaissé",
    sansMontant: "Facultatif : vide, l'acompte est encaissé sans montant connu.",
  },
  solde: {
    nom: "Le solde",
    bouton: "Solde encaissé",
    sansMontant: "Facultatif : vide, le solde est encaissé sans montant connu.",
  },
};

export type SettlementEditorProps = {
  /** Le montant déjà connu, s'il y en a un. */
  amount: string | null;
  /** Le jour de l'encaissement déjà connu — le vrai, jamais un repli. */
  paidAt?: string | null;
  /** Acompte ou solde. Par défaut l'acompte, le premier des deux à exister. */
  kind?: ReglementKind;
  /** Le règlement est-il déjà encaissé ? Il décide des libellés. */
  paid: boolean;
  total: DepositTotal | null;
  /** Les virements, quand l'écran les connaît. */
  transfers?: SettlementTransfers;
  pending?: boolean;
  /**
   * Encaisse, ou corrige le montant et le jour d'un règlement déjà encaissé.
   *
   * Rend la réussite de l'écriture : le panneau ne se ferme que sur un succès,
   * sans quoi un montant tapé disparaîtrait sans un mot.
   */
  onSave: (amount: string | null, paidAt?: string) => boolean | Promise<boolean>;
  /** Retire l'encaissement. Absent, le bouton ne s'affiche pas. */
  onRemove?: () => boolean | Promise<boolean>;
};

/**
 * Les règlements d'une affaire : combien, quand, et par quels virements.
 *
 * « Acompte encaissé » se disait de quatre façons : un cran de la frise, un
 * bouton de « à faire maintenant », une case de l'après-signature qui posait
 * la date du jour, et des virements sous le devis qui changeaient le montant
 * sans rien dire du statut. Quatre saisies d'un même fait, quatre règles. Il
 * n'en reste qu'une, ce composant, que les quatre endroits — et la fiche d'un
 * chantier — ouvrent à l'identique. Il écrit par `PUT /v1/quotes/{id}/deposit`
 * (ou `/balance`) sur la pièce que `paymentCarrier` désigne : l'appelant la lui
 * donne, il ne la choisit pas.
 *
 * **Le jour est demandé, jamais posé d'office.** C'est celui du relevé, et le
 * jour du clic n'en dit rien : on rattrape souvent l'encaissement de la
 * semaine passée. Quand des virements existent, le dernier le propose — c'est
 * un fait, pas une supposition.
 *
 * **Dès qu'un virement existe, leur somme fait le montant** : le serveur la
 * recopie sur le devis, et le champ se fige pour ne jamais afficher deux
 * nombres qui pourraient se contredire.
 */
export function SettlementEditor({
  amount,
  kind = "acompte",
  paidAt,
  paid,
  total,
  transfers,
  pending,
  onSave,
  onRemove,
  onClose,
}: SettlementEditorProps & { onClose: () => void }) {
  const id = useId();
  const mots = REGLEMENT[kind];
  const virements = transfers?.payments ?? [];
  const parVirements = virements.length > 0;
  const [draft, setDraft] = useState(() => amountToInput(amount));
  const parsed = parVirements ? amount : parseAmountInput(draft);

  const jourConnu = paidAt ? paidAt.slice(0, 10) : "";
  const [jour, setJour] = useState(() => jourConnu || (virements.at(-1)?.paid_at ?? ""));
  /*
    Le jour part s'il a été choisi, ou si l'on encaisse : un règlement déjà
    encaissé dont on ne corrige que le montant ne réécrit pas sa date.
  */
  const jourEnvoye = jour !== "" && (!paid || jour !== jourConnu) ? jour : undefined;
  const sansJour = !paid && jour === "";
  const illisible = parsed === undefined;
  const percent =
    parsed && total && Number(total.value) > 0
      ? Math.round((Number(parsed) / Number(total.value)) * 100)
      : null;

  async function envoyer(action: () => boolean | Promise<boolean>) {
    if (await action()) onClose();
  }

  return (
    <div className="flex flex-col gap-3" data-demo="reglement-editeur">
      <form
        id={`${id}-form`}
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (illisible || sansJour || pending) return;
          void envoyer(() => onSave(parsed ?? null, jourEnvoye));
        }}
      >
        <div>
          <label htmlFor={id} className="text-muted-foreground mb-1 block text-[11px]">
            Montant encaissé
          </label>
          <div className="relative">
            <Input
              id={id}
              autoFocus={!parVirements}
              inputMode="decimal"
              placeholder="2 400"
              value={parVirements ? amountToInput(amount) : draft}
              readOnly={parVirements}
              disabled={pending}
              aria-invalid={illisible || undefined}
              className="h-9 pr-7 text-sm font-semibold tabular-nums"
              onChange={(event) => setDraft(event.target.value)}
            />
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm">
              €
            </span>
          </div>
          <p className={cn("mt-1 text-[11px]", illisible ? "text-danger" : "text-muted-foreground")}>
            {illisible
              ? "Un montant en euros, par exemple 2 400 ou 2 400,50."
              : parVirements
                ? "La somme des virements ci-dessous."
                : percent !== null && total
                  ? `Soit ${percent} % du devis ${total.tax} (${formatAmount(total.value)}).`
                  : total
                    ? `Devis à ${formatAmount(total.value)} ${total.tax}.`
                    : mots.sansMontant}
          </p>
        </div>

        <div>
          <label htmlFor={`${id}-jour`} className="text-muted-foreground mb-1 block text-[11px]">
            Encaissé le
          </label>
          <div className="flex items-center gap-2">
            <Input
              id={`${id}-jour`}
              type="date"
              value={jour}
              disabled={pending}
              required={!paid}
              className="h-8 flex-1 text-sm"
              data-demo="reglement-date"
              onChange={(event) => setJour(event.target.value)}
            />
            <Button
              type="button"
              size="xs"
              variant="ghost"
              disabled={pending}
              onClick={() => setJour(aujourdhui())}
            >
              Aujourd&apos;hui
            </Button>
          </div>
          {sansJour && (
            <p className="text-muted-foreground mt-1 text-[11px]">
              Le jour où il est arrivé, tel que le relevé le montre.
            </p>
          )}
        </div>
      </form>

      {transfers && (transfers.canWrite || parVirements) && (
        <div data-demo="reglement-virements" className="flex flex-col gap-1 border-t pt-2">
          <span className="text-muted-foreground text-[11px]">Virements</span>
          <QuotePayments
            quoteId={transfers.quoteId}
            kind={kind}
            payments={virements}
            canWrite={transfers.canWrite}
            onChanged={transfers.onChanged}
          />
        </div>
      )}

      <p className="text-muted-foreground/70 text-[11px]">
        {mots.nom} vit sur le devis : son statut, son montant et sa date changent.
      </p>

      <div className="flex items-center justify-end gap-2">
        {paid && onRemove && (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={pending}
            className="mr-auto"
            onClick={() => void envoyer(onRemove)}
          >
            Retirer l&apos;encaissement
          </Button>
        )}
        <Button
          type="submit"
          form={`${id}-form`}
          size="xs"
          disabled={pending || illisible || sansJour}
        >
          {paid ? "Enregistrer" : mots.bouton}
        </Button>
      </div>
    </div>
  );
}

/** La clé qui fait repartir le brouillon de ce que porte le devis. */
function editorKey(editor: SettlementEditorProps): string {
  return [
    editor.kind ?? "acompte",
    editor.amount ?? "vide",
    editor.paidAt ?? "sans-date",
    editor.transfers?.payments.length ?? 0,
  ].join("·");
}

/**
 * Les règlements en boîte de dialogue : « à faire maintenant » et la ligne
 * d'un devis y mènent, là où l'œil est déjà.
 */
export function SettlementDialog({
  open,
  onOpenChange,
  ...editor
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & SettlementEditorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{REGLEMENT[editor.kind ?? "acompte"].bouton}</DialogTitle>
          <DialogDescription>
            Le montant réellement reçu, le jour où il est arrivé, et ses
            virements. Tout se corrige ensuite.
          </DialogDescription>
        </DialogHeader>
        <SettlementEditor
          key={editorKey(editor)}
          {...editor}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Les règlements depuis une ligne — l'après-signature, la fiche d'un chantier. */
export function SettlementButton({
  disabled,
  ...editor
}: SettlementEditorProps & { disabled?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="xs" variant={editor.paid ? "ghost" : "outline"} disabled={disabled}>
          {editor.paid ? "Modifier" : "Encaisser"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-[80vh] w-80 overflow-y-auto" align="end">
        <SettlementEditor
          key={`${open}·${editorKey(editor)}`}
          {...editor}
          pending={editor.pending || disabled}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
