"use client";

import { useState } from "react";
import Link from "next/link";
import { ScaleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAmount, formatDate, plural } from "@/shared/lib/format";
import { pieceRefText } from "../lib/piece-ref";
import { DUNNING_STAGE } from "../lib/syndic-labels";
import type { Recovery } from "../lib/syndic-types";
import { DunningDialog } from "./dunning-dialog";

/**
 * Les factures à recouvrer, et où en est la relance de chacune.
 *
 * La même liste sert le portefeuille d'un syndic — ce que ses immeubles
 * doivent — et l'écran Facturation → Recouvrement, qui les montre toutes. Une
 * ligne ouvre l'échelle de sa facture ; un montant réclamé qui n'est plus le
 * reste dû du jour se signale, parce que c'est lui qu'un huissier recopie.
 */
export function RecoveryList({
  items,
  onChanged,
  demo,
}: {
  items: Recovery[];
  onChanged: () => void;
  demo?: string;
}) {
  const [opened, setOpened] = useState<Recovery | null>(null);

  return (
    <>
      <ul className="divide-y rounded-xl border" data-demo={demo}>
        {items.map((item) => (
          <li key={item.quote_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
            <span className="font-mono text-xs">{pieceRefText(item.issuer, item.reference)}</span>
            <Link
              href={`/customers/${item.customer_id}?affaire=${item.project_id}&onglet=devis`}
              className="min-w-0 font-medium break-words hover:underline"
            >
              {item.customer_name}
            </Link>
            <span className="text-muted-foreground min-w-0 flex-1 truncate">
              {item.project_label}
              {item.payer_name && ` · payé par ${item.payer_name}`}
            </span>
            <span className="font-semibold tabular-nums">{formatAmount(item.remaining)}</span>
            <span className={item.days_late > 0 ? "text-danger text-xs" : "text-muted-foreground text-xs"}>
              {item.days_late > 0
                ? `${plural(item.days_late, "jour")} de retard`
                : item.due_at
                  ? `échéance le ${formatDate(item.due_at)}`
                  : "sans échéance"}
            </span>
            <span className={item.stale ? "text-warning text-xs" : "text-muted-foreground text-xs"}>
              {item.last_step === ""
                ? "jamais relancée"
                : `${DUNNING_STAGE[item.last_step].label} · ${formatDate(item.last_step_at)}`}
              {item.stale && item.last_claimed && ` · ${formatAmount(item.last_claimed)} réclamés, périmé`}
            </span>
            <Button
              size="xs"
              variant="outline"
              aria-label={`Recouvrement de ${pieceRefText(item.issuer, item.reference)}`}
              onClick={() => setOpened(item)}
            >
              <ScaleIcon />
              Recouvrement…
            </Button>
          </li>
        ))}
      </ul>
      {opened && (
        <DunningDialog
          quoteId={opened.quote_id}
          title={pieceRefText(opened.issuer, opened.reference)}
          onClose={() => setOpened(null)}
          onChanged={onChanged}
        />
      )}
    </>
  );
}
