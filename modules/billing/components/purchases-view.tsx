"use client";

import { useState } from "react";
import Link from "next/link";
import { scopeParam, useScope } from "@/modules/group";
import { listPurchases, type SupplierPurchases } from "@/modules/customers";
import { LIVE, useCached } from "@/shared/api/cache";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { SelectField } from "@/shared/ui/form";
import { TableSkeleton } from "@/shared/ui/loading";
import { formatAmount, formatDate, plural } from "@/shared/lib/format";
import { appHref } from "@/shared/lib/routes";

/**
 * « Achats » : ce qu'on commande à chaque fournisseur, ce qu'il facture, et ce
 * qui reste à lui régler (migration 112).
 *
 * Réelle, comme « À affecter » et « Recouvrement » : elle lit la base, dans le
 * périmètre de la société. Le coût est ce que le fournisseur a facturé, à
 * défaut ce qu'on lui a commandé. **L'écart** compare les deux sur les seules
 * commandes qui portent l'un et l'autre : c'est ce qui dit qu'un fournisseur
 * facture plus que ses devis. Comparer des prix à l'article demanderait des
 * lignes de commande, que le CRM ne porte pas — l'écran ne le prétend pas.
 */
export function PurchasesView() {
  const issuer = scopeParam(useScope());
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(String(thisYear));
  const { data, error, isLoading, mutate } = useCached(
    `billing:purchases:${issuer ?? ""}:${year}`,
    () => listPurchases(issuer, year === "" ? undefined : Number(year)),
    LIVE,
  );
  const rows = data ?? [];
  const sum = (pick: (row: SupplierPurchases) => string) =>
    rows.reduce((total, row) => total + Math.round(Number(pick(row)) * 100), 0) / 100;
  const cost = sum((row) => row.cost);
  const unpaid = sum((row) => row.unpaid);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3" data-demo="purchases-head">
        <div>
          <h1 className="text-base font-semibold">Achats</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {rows.length === 0
              ? "Les commandes passées aux fournisseurs se résument ici."
              : `${plural(rows.length, "fournisseur")} · ${formatAmount(String(cost))} HT de coût matière` +
                (unpaid > 0 ? ` · ${formatAmount(String(unpaid))} HT à régler` : "")}
          </p>
        </div>
        <SelectField
          label="Période"
          wrapperClassName="w-40"
          options={[0, 1, 2].map((back) => ({ value: String(thisYear - back), label: String(thisYear - back) }))}
          emptyLabel="Toutes les années"
          value={year}
          onValueChange={setYear}
        />
      </header>
      {error ? <ErrorNotice message="Achats illisibles." onRetry={() => void mutate()} /> : null}
      {error && !data ? null : isLoading && !data ? (
        <TableSkeleton rows={4} columns={6} hue="jade" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Aucune commande sur la période"
          description="Une commande s'inscrit depuis l'affaire qu'elle sert, sous ses devis. La facture du fournisseur s'y saisit ensuite."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border" data-demo="purchases-table">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">Les achats par fournisseur</caption>
            <thead className="text-muted-foreground bg-muted/40 text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fournisseur</th>
                <th className="px-3 py-2 text-right font-medium">Commandes</th>
                <th className="px-3 py-2 text-right font-medium">Coût HT</th>
                <th className="px-3 py-2 text-right font-medium">Facturé HT</th>
                <th className="px-3 py-2 text-right font-medium" title="Facturé moins commandé, sur les commandes qui portent les deux montants">
                  Écart sur devis
                </th>
                <th className="px-3 py-2 text-right font-medium">À régler HT</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.supplier_id} className="align-top">
                  <td className="px-3 py-2">
                    <Link href={appHref(`/customers/${row.supplier_id}?vue=commandes`)} className="font-medium hover:underline">
                      {row.supplier_name}
                    </Link>
                    <div className="text-muted-foreground text-xs">
                      {[
                        plural(row.projects, "affaire"),
                        row.last_order_at && `dernière commande le ${formatDate(row.last_order_at)}`,
                        row.late > 0 && `${plural(row.late, "livraison")} en retard`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.orders}
                    <div className="text-muted-foreground text-xs">
                      {[row.quoted > 0 && `${row.quoted} en devis`, row.cancelled > 0 && `${plural(row.cancelled, "annulée")}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{formatAmount(row.cost)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatAmount(row.invoiced)}</td>
                  <DriftCell row={row} />
                  <td
                    className={
                      Number(row.unpaid) > 0
                        ? "text-warning px-3 py-2 text-right tabular-nums"
                        : "text-muted-foreground px-3 py-2 text-right tabular-nums"
                    }
                  >
                    {formatAmount(row.unpaid)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Ce que le fournisseur a facturé en plus — ou en moins — de ses devis. */
function DriftCell({ row }: { row: SupplierPurchases }) {
  const ordered = Number(row.drift_ordered);
  const drift = Math.round((Number(row.drift_invoiced) - ordered) * 100) / 100;
  if (ordered <= 0) {
    return <td className="text-muted-foreground px-3 py-2 text-right">—</td>;
  }
  const rate = Math.round((drift / ordered) * 100);
  return (
    <td className={drift > 0 ? "text-warning px-3 py-2 text-right tabular-nums" : "px-3 py-2 text-right tabular-nums"}>
      {drift > 0 ? "+" : drift < 0 ? "−" : ""}
      {formatAmount(String(Math.abs(drift)))}
      <div className="text-muted-foreground text-xs">
        {rate > 0 ? "+" : ""}
        {rate} % sur {formatAmount(row.drift_ordered)}
      </div>
    </td>
  );
}
