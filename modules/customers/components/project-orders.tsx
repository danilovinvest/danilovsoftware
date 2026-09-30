"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIVE, revalidatePrefixes, useCached } from "@/shared/api/cache";
import { askConfirm } from "@/shared/ui/confirm";
import { ErrorNotice } from "@/shared/ui/feedback";
import { formatAmount, formatDate, todayLocal } from "@/shared/lib/format";
import { useAction } from "../hooks/use-customers";
import {
  DELIVERY_MODE,
  ORDER_STATUS,
  deleteOrder,
  listProjectOrders,
  orderCost,
  orderLate,
  type SupplierOrder,
} from "../lib/supplier-orders";
import { EnumBadge } from "./enum-badge";
import { OrderDialog } from "./order-dialog";
import { RowMenu } from "./row-menu";

/**
 * Les commandes fournisseur d'une affaire, sous ses devis (migration 111).
 *
 * En face des montants, comme la sous-traitance : c'est là que le coût matière
 * a un sens. Chaque ligne dit à qui, sous quel numéro, et pour quand ; une
 * commande dont la date est passée sans être livrée se signale. Le coût engagé
 * additionne ce qui est commandé ou livré, et dit quand il en ignore.
 */
export function ProjectOrders({
  projectId,
  canWrite,
  onChanged,
}: {
  projectId: string;
  canWrite: boolean;
  /** Une commande ferme franchit un cran : la fiche se relit. */
  onChanged: () => void;
}) {
  const { data, error, mutate } = useCached(`customers:orders:${projectId}`, () => listProjectOrders(projectId), LIVE);
  const [editing, setEditing] = useState<SupplierOrder | "new" | null>(null);
  const remove = useAction(deleteOrder);
  const orders = data ?? [];
  const cost = orderCost(orders);
  const today = todayLocal();

  function adopt(next: SupplierOrder[]) {
    void mutate(next, { revalidate: false });
    // La fiche du fournisseur résume ces commandes, et le cran a pu bouger.
    revalidatePrefixes("customers:supplier-orders:");
    onChanged();
  }

  async function retirer(order: SupplierOrder) {
    const sure = await askConfirm({
      title: `Retirer la commande « ${order.label} » ?`,
      description: "La commande quitte l'affaire. Le cran « Matériaux commandés » ne bouge pas : il se corrige sur la frise.",
      confirmLabel: "Retirer",
      destructive: true,
    });
    if (!sure) return;
    const next = await remove.run(order.id);
    if (next) adopt(next);
  }

  if (!data && !error) return null;
  // Rien à lire et rien à écrire : le bloc n'aurait que son titre.
  if (orders.length === 0 && !canWrite && !error) return null;

  return (
    <section className="flex flex-col gap-2 border-t pt-3" data-demo="project-orders">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">
          Commandes fournisseur
          {cost.firm > 0 && (
            <span className="text-muted-foreground font-normal">
              {" "}
              · coût engagé {formatAmount(String(cost.firm / 100))} HT
              {cost.unknown > 0 && `, ${cost.unknown} sans montant`}
            </span>
          )}
        </h3>
        {canWrite && (
          <Button size="xs" variant="outline" onClick={() => setEditing("new")}>
            <PlusIcon />
            Commande
          </Button>
        )}
      </div>
      {error ? <ErrorNotice message="Commandes illisibles." onRetry={() => void mutate()} /> : null}
      {orders.length > 0 && (
        <ul className="divide-y rounded-lg border text-sm">
          {orders.map((order) => {
            const late = orderLate(order, today);
            return (
              <li key={order.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium break-words">{order.label}</span>
                    <EnumBadge value={order.status} entries={ORDER_STATUS} />
                  </div>
                  <div className="text-muted-foreground text-xs break-words">
                    <Link href={`/customers/${order.supplier_id}?vue=commandes`} className="hover:underline">
                      {order.supplier_name}
                    </Link>
                    {[
                      order.supplier_reference && `devis ${order.supplier_reference}`,
                      order.ordered_at && `commandé le ${formatDate(order.ordered_at)}`,
                      order.invoice_reference && `facture ${order.invoice_reference}`,
                    ]
                      .filter(Boolean)
                      .map((part) => ` · ${part}`)
                      .join("")}
                  </div>
                  {order.expected_at && (
                    <div className={late ? "text-danger text-xs" : "text-muted-foreground text-xs"}>
                      {order.delivery_mode ? DELIVERY_MODE[order.delivery_mode] : "Réception"} le{" "}
                      {formatDate(order.expected_at)}
                      {late && " — date passée, à relancer"}
                    </div>
                  )}
                  {order.note && <p className="text-muted-foreground text-xs break-words">{order.note}</p>}
                </div>
                {order.amount_ht && (
                  <span className="font-medium tabular-nums">{formatAmount(order.amount_ht)} HT</span>
                )}
                {order.document_url && (
                  <a
                    href={order.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium hover:underline"
                  >
                    Ouvrir
                  </a>
                )}
                <RowMenu
                  label={`Actions sur la commande ${order.label}`}
                  disabled={remove.pending}
                  onEdit={canWrite ? () => setEditing(order) : undefined}
                  editLabel="Modifier la commande…"
                  onDelete={canWrite ? () => void retirer(order) : undefined}
                  deleteLabel="Retirer la commande…"
                />
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <OrderDialog
          projectId={projectId}
          order={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={adopt}
        />
      )}
    </section>
  );
}
