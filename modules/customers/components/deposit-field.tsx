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
import { formatAmount } from "@/shared/lib/format";
import { cn } from "@/lib/utils";

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

/**
 * Lit un montant tapé à la française : « 2 400,50 € » → « 2400.50 ».
 *
 * `undefined` dit « illisible », `null` dit « vide » — et vide est une réponse
 * légitime : on sait qu'un acompte est arrivé sans toujours savoir combien.
 */
export function parseAmountInput(text: string | null): string | null | undefined {
  const cleaned = (text ?? "").replace(/[\s  €]/g, "").replace(",", ".");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  return cleaned;
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
 * Le montant de l'acompte, saisi en l'encaissant et corrigé ensuite.
 *
 * « Acompte encaissé » était une case : on affirmait avoir été payé sans dire
 * combien, alors que le client négocie l'acompte, le fractionne ou le change en
 * cours de route — et c'est le montant qu'on vérifie sur le relevé. Le champ
 * part donc rempli de ce que porte déjà le devis, et reste modifiable tant que
 * l'affaire vit.
 *
 * Le même éditeur sert la frise, « à faire maintenant », l'après-signature et
 * la fiche d'un chantier : quatre saisies du même montant auraient divergé au
 * premier ajustement.
 */
export function DepositEditor({
  amount,
  paid,
  total,
  pending,
  onSave,
  onRemove,
  onClose,
}: {
  /** Le montant déjà connu, s'il y en a un. */
  amount: string | null;
  /** L'acompte est-il déjà encaissé ? Il décide des libellés. */
  paid: boolean;
  total: DepositTotal | null;
  pending?: boolean;
  /**
   * Encaisse, ou corrige le montant d'un acompte déjà encaissé.
   *
   * Rend la réussite de l'écriture : le panneau ne se ferme que sur un succès,
   * sans quoi un montant tapé disparaîtrait sans un mot.
   */
  onSave: (amount: string | null) => boolean | Promise<boolean>;
  /** Retire l'encaissement. Absent, le bouton ne s'affiche pas. */
  onRemove?: () => boolean | Promise<boolean>;
  onClose: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(() => (amount ? amount.replace(".", ",") : ""));
  const parsed = parseAmountInput(draft);
  const illisible = parsed === undefined;
  const percent =
    parsed && total && Number(total.value) > 0
      ? Math.round((Number(parsed) / Number(total.value)) * 100)
      : null;

  async function envoyer(action: () => boolean | Promise<boolean>) {
    if (await action()) onClose();
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (illisible || pending) return;
        void envoyer(() => onSave(parsed ?? null));
      }}
    >
      <div>
        <label htmlFor={id} className="text-muted-foreground mb-1 block text-[11px]">
          Montant encaissé
        </label>
        <div className="relative">
          <Input
            id={id}
            autoFocus
            inputMode="decimal"
            placeholder="2 400"
            value={draft}
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
            : percent !== null && total
              ? `Soit ${percent} % du devis ${total.tax} (${formatAmount(total.value)}).`
              : total
                ? `Devis à ${formatAmount(total.value)} ${total.tax}.`
                : "Facultatif : vide, l'acompte est encaissé sans montant connu."}
        </p>
      </div>

      <p className="text-muted-foreground/70 text-[11px]">
        L&apos;acompte vit sur le devis : son statut et son montant changent.
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
        <Button type="submit" size="xs" disabled={pending || illisible}>
          {paid ? "Enregistrer" : "Acompte encaissé"}
        </Button>
      </div>
    </form>
  );
}

/**
 * La même saisie, en boîte de dialogue, pour le bouton de « à faire
 * maintenant » : il arrive là où l'œil est déjà, comme la commande de
 * matériaux.
 */
export function DepositDialog({
  open,
  onOpenChange,
  ...editor
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & Omit<Parameters<typeof DepositEditor>[0], "onClose">) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Acompte encaissé</DialogTitle>
          <DialogDescription>
            Le montant réellement reçu. Il se corrige ensuite si le client le
            change.
          </DialogDescription>
        </DialogHeader>
        <DepositEditor
          // Le brouillon repart de ce que porte le devis à chaque ouverture.
          key={`${open}·${editor.amount ?? "vide"}`}
          {...editor}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
