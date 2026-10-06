"use client";

import { useState } from "react";
import { BanknoteArrowDownIcon, SplitIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { askConfirm } from "@/shared/ui/confirm";
import { formatAmount, formatDate } from "@/shared/lib/format";
import { removePendingReceipt } from "../lib/receipts-api";
import { useAction } from "../hooks/use-customers";
import { AllocateDialog } from "./allocate-dialog";
import { ReceiptDialog } from "./receipt-dialog";
import { RowMenu } from "./row-menu";
import type { PaymentPart } from "../lib/receipt-types";
import type { CustomerDetail } from "../lib/types";

/**
 * Le bouton « Encaissement sans facture » d'une fiche (migration 106) : un
 * virement arrivé avant sa pièce s'inscrit sur la fiche du payeur, et attend.
 */
export function ReceiptButton({ customer, onChanged }: { customer: CustomerDetail; onChanged: () => void }) {
  const canWrite = usePermission("quotes:write");
  const [open, setOpen] = useState(false);
  if (!canWrite) return null;
  return (
    <>
      <Button size="xs" variant="outline" onClick={() => setOpen(true)} data-demo="receipt-new">
        <BanknoteArrowDownIcon />
        Encaissement sans facture
      </Button>
      {open && (
        <ReceiptDialog
          customer={{ id: customer.id, name: customer.display_name }}
          onClose={() => setOpen(false)}
          onSaved={onChanged}
        />
      )}
    </>
  );
}

/**
 * Ce que la fiche a reçu sans que cela règle une pièce : les encaissements en
 * attente d'affectation, chacun avec « Affecter… », et les parts hors CRM, qui
 * ne se lisent plus seulement par l'assistant. Rien quand il n'y a rien.
 */
export function CustomerReceipts({ customer, onChanged }: { customer: CustomerDetail; onChanged: () => void }) {
  const canWrite = usePermission("quotes:write");
  const [allocating, setAllocating] = useState<PaymentPart | null>(null);
  const remove = useAction(removePendingReceipt);
  const parts = customer.unallocated_parts ?? [];
  if (parts.length === 0) return null;

  async function retirer(part: PaymentPart) {
    const ok = await askConfirm({
      title: `Retirer l'encaissement du ${formatDate(part.paid_at)}`,
      description: `${formatAmount(part.amount)} en attente quittent la fiche. Rien d'autre ne bouge.`,
      confirmLabel: "Retirer",
    });
    if (ok && (await remove.run(part.id)) !== null) onChanged();
  }

  return (
    <section className="rounded-xl border px-3 py-2" data-demo="customer-receipts">
      <h3 className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">
        Encaissements hors pièce
      </h3>
      <ul className="divide-y">
        {parts.map((part) => (
          <li key={part.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-sm">
            <span className="text-muted-foreground tabular-nums">{formatDate(part.paid_at)}</span>
            <span className="font-semibold tabular-nums">{formatAmount(part.amount)}</span>
            <span className="min-w-0 flex-1 truncate">{part.label}</span>
            {part.bank_account_label && (
              <span className="text-muted-foreground text-xs">{part.bank_account_label}</span>
            )}
            <span
              className={
                part.pending
                  ? "text-warning bg-warning-soft rounded-md px-1.5 py-0.5 text-[0.65rem]"
                  : "text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]"
              }
            >
              {part.pending ? "à affecter" : "hors CRM"}
            </span>
            {part.pending && canWrite && (
              <>
                <Button size="xs" variant="outline" onClick={() => setAllocating(part)} data-demo="receipt-allocate">
                  <SplitIcon />
                  Affecter…
                </Button>
                <RowMenu
                  label={`Actions sur l'encaissement du ${formatDate(part.paid_at)}`}
                  disabled={remove.pending}
                  onDelete={() => void retirer(part)}
                  deleteLabel="Retirer l'encaissement…"
                >
                  <DropdownMenuItem onSelect={() => setAllocating(part)}>
                    <SplitIcon />
                    Affecter…
                  </DropdownMenuItem>
                </RowMenu>
              </>
            )}
          </li>
        ))}
      </ul>
      {allocating && (
        <AllocateDialog part={allocating} onClose={() => setAllocating(null)} onDone={onChanged} />
      )}
    </section>
  );
}
