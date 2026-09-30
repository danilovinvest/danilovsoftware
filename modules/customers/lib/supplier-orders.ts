import { apiFetch } from "@/shared/api/client";

/**
 * Les commandes passées aux fournisseurs (migration 111) : types miroirs de
 * l'API, appels, libellés, et ce que l'écran en additionne.
 */

export type OrderStatus = "devis" | "commande" | "livre" | "annule";
export type DeliveryMode = "livraison" | "retrait";

export type SupplierOrder = {
  id: string;
  supplier_id: string;
  supplier_name: string;
  project_id: string;
  status: OrderStatus;
  /** Le numéro du devis ou de la commande chez le fournisseur. */
  supplier_reference: string;
  /** Ce qui est commandé : « 3 HEA200 · 4,20 m ». */
  label: string;
  delivery_mode: DeliveryMode | "";
  ordered_at: string | null;
  expected_at: string | null;
  amount_ht: string | null;
  invoice_reference: string;
  document_url: string;
  note: string;
  /** Renseignés vus du fournisseur. */
  project_label?: string;
  customer_id?: string;
  customer_name?: string;
};

export type OrderPayload = Omit<
  SupplierOrder,
  "id" | "supplier_name" | "project_id" | "project_label" | "customer_id" | "customer_name"
>;

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "neutral" | "info" | "success" | "danger" }> = {
  devis: { label: "Devis reçu", tone: "neutral" },
  commande: { label: "Commandé", tone: "info" },
  livre: { label: "Livré", tone: "success" },
  annule: { label: "Annulé", tone: "danger" },
};

export const DELIVERY_MODE: Record<DeliveryMode, string> = {
  livraison: "Livraison",
  retrait: "Retrait au dépôt",
};

/** Les commandes d'une affaire. Chaque écriture rend la liste entière. */
export function listProjectOrders(projectId: string, signal?: AbortSignal) {
  return apiFetch<SupplierOrder[]>(`/v1/projects/${projectId}/orders`, { signal });
}

export function createOrder(projectId: string, payload: OrderPayload) {
  return apiFetch<SupplierOrder[]>(`/v1/projects/${projectId}/orders`, { method: "POST", body: payload });
}

export function updateOrder(orderId: string, payload: OrderPayload) {
  return apiFetch<SupplierOrder[]>(`/v1/orders/${orderId}`, { method: "PUT", body: payload });
}

export function deleteOrder(orderId: string) {
  return apiFetch<SupplierOrder[]>(`/v1/orders/${orderId}`, { method: "DELETE" });
}

/** Les commandes passées à un fournisseur, dans le périmètre du compte. */
export function listSupplierOrders(supplierId: string, issuer?: string, signal?: AbortSignal) {
  const path = `/v1/customers/${supplierId}/supplier-orders`;
  return apiFetch<SupplierOrder[]>(issuer ? `${path}?issuer=${encodeURIComponent(issuer)}` : path, { signal });
}

export type OrderCost = {
  /** Commandé ou livré : le coût matière engagé, en centimes. */
  firm: number;
  /** Encore en devis : ce qui s'ajouterait. */
  quoted: number;
  /** Les commandes fermes dont on ignore le montant : le total les sous-estime. */
  unknown: number;
};

/**
 * Le coût matière d'un ensemble de commandes, au centime entier.
 *
 * Une commande annulée ne coûte rien ; un devis n'est pas encore une dépense.
 * Une commande ferme sans montant est comptée à part : l'écran dit que le
 * total en ignore, plutôt que d'afficher un coût qu'il sait incomplet.
 */
export function orderCost(orders: Pick<SupplierOrder, "status" | "amount_ht">[]): OrderCost {
  const cost: OrderCost = { firm: 0, quoted: 0, unknown: 0 };
  for (const order of orders) {
    if (order.status === "annule") continue;
    const cents = order.amount_ht === null ? null : Math.round(Number(order.amount_ht) * 100);
    const firm = order.status !== "devis";
    if (cents === null || Number.isNaN(cents)) {
      if (firm) cost.unknown += 1;
      continue;
    }
    if (firm) cost.firm += cents;
    else cost.quoted += cents;
  }
  return cost;
}

/** Une commande ferme dont la date prévue est passée sans qu'elle soit livrée. */
export function orderLate(order: Pick<SupplierOrder, "status" | "expected_at">, today: string): boolean {
  return order.status === "commande" && order.expected_at !== null && order.expected_at < today;
}
