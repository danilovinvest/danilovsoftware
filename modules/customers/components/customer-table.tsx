"use client";

import Link from "next/link";
import { formatAmount, formatPhone, formatRelative } from "@/shared/lib/format";
import { Skeleton } from "@/shared/ui/feedback";
import { CUSTOMER_SOURCE, CUSTOMER_STATUS } from "../lib/labels";
import { EnumBadge } from "./enum-badge";
import type { CustomerListItem } from "../lib/types";

export function CustomerTable({
  items,
  loading,
}: {
  items: CustomerListItem[];
  loading: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs font-medium text-muted-foreground">
            <th className="px-5 py-3">Fiche</th>
            <th className="px-3 py-3">Statut</th>
            <th className="px-3 py-3">Coordonnées</th>
            <th className="px-3 py-3">Ville</th>
            <th className="px-3 py-3">Source</th>
            <th className="px-3 py-3 text-right">Projets</th>
            <th className="px-3 py-3 text-right">Signé TTC</th>
            <th className="px-5 py-3 text-right">Dernier échange</th>
          </tr>
        </thead>
        <tbody>
          {loading && items.length === 0
            ? Array.from({ length: 5 }, (_, index) => (
                <tr key={index} className="border-b border-border-subtle">
                  <td className="px-5 py-4" colSpan={8}>
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))
            : items.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-border-subtle transition-colors last:border-0 hover:bg-surface-muted"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="font-medium text-foreground hover:text-accent"
                    >
                      {customer.display_name}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">
                      {customer.reference}
                      {customer.company_name && ` · ${customer.company_name}`}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <EnumBadge value={customer.status} entries={CUSTOMER_STATUS} />
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {customer.email && <div>{customer.email}</div>}
                    {customer.phone && <div>{formatPhone(customer.phone)}</div>}
                    {!customer.email && !customer.phone && "—"}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {customer.city || "—"}
                  </td>
                  <td className="px-3 py-3">
                    <EnumBadge value={customer.source} entries={CUSTOMER_SOURCE} />
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {customer.project_count}
                    <span className="opacity-50"> / {customer.quote_count} devis</span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {customer.won_amount_ttc === "0"
                      ? "—"
                      : formatAmount(customer.won_amount_ttc)}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                    {formatRelative(customer.last_interaction_at)}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
