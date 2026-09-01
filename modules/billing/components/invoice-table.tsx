"use client";

import { useState } from "react";
import { ReceiptEuroIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/ui/feedback";
import { euros, eurosShort, formatDate, plural } from "@/shared/lib/format";
import { Panel, TONE_SOFT } from "@/shared/ui/panel";
import { entityName } from "../lib/entities";
import { INVOICE_KIND, INVOICE_STATUS, STATUS_ORDER } from "../lib/labels";
import type { Invoice, InvoiceStatus } from "../lib/types";

/**
 * Le journal des ventes.
 *
 * La colonne « Reste dû » est calculée et non stockée : c'est la différence
 * entre le TTC et ce qui a été encaissé. Un montant réglé à moitié doit sauter
 * aux yeux sans qu'on ait à soustraire de tête.
 */
export function InvoiceTable({
  invoices,
  showEntity,
}: {
  invoices: Invoice[];
  /** La colonne « Société » n'a de sens qu'en vue consolidée. */
  showEntity: boolean;
}) {
  const [filter, setFilter] = useState<InvoiceStatus | "toutes">("toutes");

  const visible =
    filter === "toutes" ? invoices : invoices.filter((i) => i.status === filter);
  const total = visible.reduce((sum, invoice) => sum + invoice.amount_ht, 0);

  return (
    <Panel
      title="Factures"
      description={`${plural(visible.length, "facture")} · ${euros(total)} HT — journal complet, que le sélecteur de période ne filtre pas`}
      icon={ReceiptEuroIcon}
      tone="info"
      action={
        <div className="flex flex-wrap gap-1">
          {(["toutes", ...STATUS_ORDER] as const).map((key) => {
            const count =
              key === "toutes"
                ? invoices.length
                : invoices.filter((i) => i.status === key).length;
            if (count === 0 && key !== "toutes") return null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-[4px] px-2 py-1 text-xs transition-colors",
                  filter === key
                    ? "bg-selected text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {key === "toutes" ? "Toutes" : INVOICE_STATUS[key].label}
                <span className="ml-1 tabular-nums opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      }
    >
      {visible.length === 0 ? (
        <EmptyState title="Aucune facture dans cette catégorie" />
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[68rem] [&_thead_th]:text-muted-foreground [&_thead_th]:h-8 [&_thead_th]:text-xs [&_thead_th]:font-medium">
            <TableHeader>
              <TableRow>
                <TableHead>Facture</TableHead>
                <TableHead>Client</TableHead>
                {showEntity && <TableHead>Société émettrice</TableHead>}
                <TableHead className="text-right">HT</TableHead>
                <TableHead className="text-right">TTC</TableHead>
                <TableHead className="text-right">Reste dû</TableHead>
                <TableHead className="text-right">Échéance</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((invoice) => {
                const status = INVOICE_STATUS[invoice.status];
                const due =
                  invoice.status === "brouillon" || invoice.status === "avoir"
                    ? 0
                    : invoice.amount_ttc - invoice.paid_amount;

                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <p className="font-mono text-xs font-medium">{invoice.number}</p>
                      <p className="text-muted-foreground text-[11px]">
                        {formatDate(invoice.issued_at)} ·{" "}
                        {INVOICE_KIND[invoice.kind]}
                      </p>
                    </TableCell>

                    <TableCell className="max-w-72">
                      <p className="truncate text-sm">
                        {invoice.customer_name}
                        {invoice.customer_entity_id && (
                          <span className="text-info ml-1.5 text-[11px]">
                            intra-groupe
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground truncate text-[11px]">
                        {invoice.label}
                      </p>
                    </TableCell>

                    {showEntity && (
                      <TableCell className="text-muted-foreground text-xs">
                        {entityName(invoice.entity_id)}
                      </TableCell>
                    )}

                    <TableCell className="text-right text-xs tabular-nums">
                      <span className="font-medium">{eurosShort(invoice.amount_ht)}</span>
                      <span className="text-muted-foreground block text-[11px]">
                        TVA {invoice.vat_rate} %
                      </span>
                    </TableCell>

                    <TableCell className="text-right text-xs tabular-nums">
                      {eurosShort(invoice.amount_ttc)}
                    </TableCell>

                    <TableCell
                      className={cn(
                        "text-right text-xs tabular-nums",
                        due > 0 && invoice.days_late > 0
                          ? "text-danger font-medium"
                          : due > 0
                            ? "text-foreground"
                            : "text-muted-foreground",
                      )}
                    >
                      {due > 0 ? eurosShort(due) : "—"}
                    </TableCell>

                    <TableCell className="text-right text-xs tabular-nums">
                      {invoice.status === "brouillon" || invoice.status === "avoir" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <>
                          {formatDate(invoice.due_at)}
                          {invoice.days_late > 0 && (
                            <span className="text-danger block text-[11px]">
                              {plural(invoice.days_late, "jour")} de retard
                            </span>
                          )}
                        </>
                      )}
                    </TableCell>

                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-0.5 text-xs whitespace-nowrap",
                          TONE_SOFT[status.tone],
                        )}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {status.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}
