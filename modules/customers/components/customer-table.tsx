"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, formatPhone, formatRelative } from "@/shared/lib/format";
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
      <Table className="min-w-[56rem]">
        <TableHeader>
          <TableRow>
            <TableHead>Fiche</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Coordonnées</TableHead>
            <TableHead>Ville</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Projets</TableHead>
            <TableHead className="text-right">Signé TTC</TableHead>
            <TableHead className="text-right">Dernier échange</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && items.length === 0
            ? Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : items.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="hover:text-primary font-medium"
                    >
                      {customer.display_name}
                    </Link>
                    <p className="text-muted-foreground font-mono text-xs">
                      {customer.reference}
                      {customer.company_name && ` · ${customer.company_name}`}
                    </p>
                  </TableCell>
                  <TableCell>
                    <EnumBadge value={customer.status} entries={CUSTOMER_STATUS} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {customer.email && <div>{customer.email}</div>}
                    {customer.phone && <div>{formatPhone(customer.phone)}</div>}
                    {!customer.email && !customer.phone && "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.city || "—"}
                  </TableCell>
                  <TableCell>
                    <EnumBadge value={customer.source} entries={CUSTOMER_SOURCE} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {customer.project_count}
                    <span className="opacity-50"> / {customer.quote_count} devis</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {customer.won_amount_ttc === "0"
                      ? "—"
                      : formatAmount(customer.won_amount_ttc)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-xs">
                    {formatRelative(customer.last_interaction_at)}
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
