"use client";

import { useState } from "react";
import Link from "next/link";
import { BanknoteArrowDownIcon, SplitIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import {
  AllocateDialog,
  ReceiptDialog,
  listPendingReceipts,
  type PaymentPart,
} from "@/modules/customers";
import { Button } from "@/components/ui/button";
import { LIVE, useCached } from "@/shared/api/cache";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { TableSkeleton } from "@/shared/ui/loading";
import { formatAmount, formatDate, plural } from "@/shared/lib/format";

/**
 * « À affecter » : les virements reçus qui ne règlent encore aucune pièce
 * (migration 106), de toutes les fiches — et ceux dont le payeur n'est pas
 * reconnu, qui n'ont pas de fiche où se lire.
 *
 * Réelle, pas simulée : c'est la seule liste de la facturation qui lit la base
 * aujourd'hui. Le périmètre de la société s'applique côté serveur — un
 * encaissement sans fiche se range par la société de son compte crédité.
 */
export function PendingReceiptsView() {
  const canWrite = usePermission("quotes:write");
  const { data, error, isLoading, mutate } = useCached(
    "receipts:pending",
    () => listPendingReceipts(),
    LIVE,
  );
  const [allocating, setAllocating] = useState<PaymentPart | null>(null);
  const [creating, setCreating] = useState(false);
  const parts = data ?? [];
  const total = parts.reduce((sum, p) => sum + Number(p.amount), 0);
  const reload = () => void mutate();

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">À affecter</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {parts.length === 0
              ? "Les virements reçus avant leur pièce attendent ici."
              : `${plural(parts.length, "encaissement")} en attente · ${formatAmount(String(total))}`}
          </p>
        </div>
        {canWrite && (
          <Button size="sm" variant="outline" onClick={() => setCreating(true)} data-demo="pending-new">
            <BanknoteArrowDownIcon />
            Encaissement sans facture
          </Button>
        )}
      </header>
      {error ? <ErrorNotice message="Encaissements illisibles." onRetry={reload} /> : null}
      {isLoading && !data ? (
        <TableSkeleton rows={4} columns={5} hue="jade" />
      ) : parts.length === 0 ? (
        <EmptyState
          title="Rien à affecter"
          description="Un virement sans facture s'inscrit ici ou depuis la fiche du payeur, puis s'affecte à ses pièces."
        />
      ) : (
        <PendingTable parts={parts} canWrite={canWrite} onAllocate={setAllocating} />
      )}
      {allocating && (
        <AllocateDialog part={allocating} onClose={() => setAllocating(null)} onDone={reload} />
      )}
      {creating && <ReceiptDialog customer={null} onClose={() => setCreating(false)} onSaved={reload} />}
    </div>
  );
}

function PendingTable({
  parts,
  canWrite,
  onAllocate,
}: {
  parts: PaymentPart[];
  canWrite: boolean;
  onAllocate: (part: PaymentPart) => void;
}) {
  return (
    <ul className="divide-y rounded-xl border" data-demo="pending-list">
      {parts.map((part) => (
        <li key={part.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
          <span className="text-muted-foreground tabular-nums">{formatDate(part.paid_at)}</span>
          <span className="font-semibold tabular-nums">{formatAmount(part.amount)}</span>
          <span className="min-w-0 flex-1 truncate">
            {part.label}
            {part.reference && part.reference !== part.label && (
              <span className="text-muted-foreground"> · {part.reference}</span>
            )}
          </span>
          <span className="text-muted-foreground text-xs">
            {part.bank_account_label || "compte non dit"}
          </span>
          {part.customer_id ? (
            <Link href={`/customers/${part.customer_id}`} className="text-xs font-medium hover:underline">
              {part.customer_name}
            </Link>
          ) : (
            <span className="text-warning text-xs">payeur non reconnu</span>
          )}
          {canWrite && (
            <Button size="xs" variant="outline" onClick={() => onAllocate(part)}>
              <SplitIcon />
              Affecter…
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
