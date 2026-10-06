"use client";

import Link from "next/link";
import { scopeParam, useScope } from "@/modules/group";
import { LIVE, useCached } from "@/shared/api/cache";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { ListSkeleton } from "@/shared/ui/loading";
import { formatAmount, formatDate, plural, todayLocal } from "@/shared/lib/format";
import { DELIVERY_MODE, ORDER_STATUS, listSupplierOrders, orderCost, orderLate } from "../lib/supplier-orders";
import { EnumBadge } from "./enum-badge";
import { InvoiceLine } from "./project-orders";

/**
 * L'onglet « Commandes » d'un fournisseur (feuille de route du 29/09,
 * phase 4) : tout ce qu'on lui a commandé, chantier par chantier.
 *
 * Balitrand écrit « ref Coppens », « Chantier TYGA » : sa fiche n'avait pas
 * d'affaire à elle, donc rien à montrer. Chaque commande mène à l'affaire
 * qu'elle sert ; on en inscrit une depuis l'affaire, là où l'on sait de quel
 * chantier on parle. Les commandes sont celles du périmètre du compte.
 */
export function SupplierOrdersPanel({ supplierId }: { supplierId: string }) {
  const issuer = scopeParam(useScope());
  const { data, error, isLoading, mutate } = useCached(
    `customers:supplier-orders:${supplierId}:${issuer ?? ""}`,
    () => listSupplierOrders(supplierId, issuer),
    LIVE,
  );
  const orders = data ?? [];
  const cost = orderCost(orders);
  const today = todayLocal();
  const pending = orders.filter((order) => order.status === "commande").length;

  if (error && !data) return <ErrorNotice message="Commandes illisibles." onRetry={() => void mutate()} />;
  if (isLoading && !data) {
    return (
      <div className="overflow-hidden rounded-xl border">
        <ListSkeleton rows={4} hue="indigo" />
      </div>
    );
  }
  if (orders.length === 0) {
    return (
      <EmptyState
        title="Aucune commande"
        description="Une commande s'inscrit depuis l'affaire qu'elle sert, sous ses devis : « Commande », puis ce fournisseur."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3" data-demo="supplier-orders">
      <p className="text-muted-foreground text-sm">
        {plural(orders.length, "commande")} · {pending} en attente de réception · engagé{" "}
        {formatAmount(String(cost.firm / 100))} HT
        {cost.unknown > 0 && ` (${cost.unknown} sans montant)`}
      </p>
      <ul className="divide-y rounded-xl border text-sm">
        {orders.map((order) => {
          const late = orderLate(order, today);
          return (
            <li key={order.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium break-words">{order.label}</span>
                  <EnumBadge value={order.status} entries={ORDER_STATUS} />
                </div>
                <div className="text-xs break-words">
                  <Link
                    href={`/customers/${order.customer_id}?affaire=${order.project_id}&onglet=devis`}
                    className="font-medium hover:underline"
                  >
                    {order.customer_name}
                  </Link>
                  <span className="text-muted-foreground"> · {order.project_label}</span>
                </div>
                <div className={late ? "text-danger text-xs" : "text-muted-foreground text-xs"}>
                  {[
                    order.supplier_reference && `devis ${order.supplier_reference}`,
                    order.ordered_at && `commandé le ${formatDate(order.ordered_at)}`,
                    order.expected_at &&
                      `${order.delivery_mode ? DELIVERY_MODE[order.delivery_mode].toLowerCase() : "réception"} le ${formatDate(order.expected_at)}`,
                    late && "date passée",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <InvoiceLine order={order} />
              </div>
              {(order.invoiced_amount_ht ?? order.amount_ht) && (
                <span className="font-medium tabular-nums">
                  {formatAmount(order.invoiced_amount_ht ?? order.amount_ht)} HT
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
