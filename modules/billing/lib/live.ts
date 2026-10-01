import { apiFetch } from "@/shared/api/client";
import type { Invoice, InvoiceKind, InvoiceStatus } from "./types";

/**
 * Les factures de la base (`GET /v1/invoices`), converties pour l'écran.
 *
 * Le serveur sert des faits — montants, net à payer, reste dû, échéance — et
 * le jour du serveur. Le statut se déduit ici, et seulement ici : « en retard »
 * dépend de l'échéance et du jour, il ne se stocke pas. Une facture sans
 * échéance saisie n'est **jamais** en retard : c'est la règle du recouvrement
 * (`due_at < aujourd'hui`), et deux écrans qui ne s'accorderaient pas sur ce
 * mot feraient douter des deux.
 *
 * Module **pur** à l'exception de l'appel réseau.
 */

export interface ApiInvoice {
  id: string;
  reference: string;
  issuer: string;
  label: string;
  kind: string;
  invoice_kind: string;
  issued_at: string | null;
  due_at: string | null;
  amount_ht: string | null;
  amount_ttc: string | null;
  vat_rate: string | null;
  net: string;
  remaining: string;
  marked_received: boolean;
  payments: number;
  customer_id: string;
  customer_name: string;
  project_id: string;
}

export interface ApiInvoices {
  today: string;
  items: ApiInvoice[];
}

/** Toutes les factures vivantes du périmètre du compte. */
export function listInvoices(signal?: AbortSignal) {
  return apiFetch<ApiInvoices>("/v1/invoices", { signal });
}

const DAY = 86_400_000;

function num(value: string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function kindOf(value: string): InvoiceKind {
  switch (value) {
    case "acompte":
    case "situation":
    case "solde":
    case "avoir":
      return value;
    default:
      return "facture";
  }
}

/** Jours entiers entre deux jours `AAAA-MM-JJ`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / DAY);
}

/**
 * Une facture de l'API, prête pour l'écran.
 *
 * Un avoir se stocke positif et se compte négatif : ses montants sont
 * retournés, et il ne doit rien. L'encaissé d'une facture est son net moins
 * son reste dû — ce que le recouvrement tient déjà pour vrai.
 */
export function toInvoice(api: ApiInvoice, today: string): Invoice {
  const kind = kindOf(api.invoice_kind);
  const credit = kind === "avoir";
  const sign = credit ? -1 : 1;
  const ht = num(api.amount_ht ?? api.amount_ttc);
  const ttc = num(api.amount_ttc);
  const remaining = credit ? 0 : round(num(api.remaining));
  const net = num(api.net);
  const paid = credit ? 0 : round(Math.max(net - remaining, 0));
  const lateBy = api.due_at ? daysBetween(api.due_at, today) : 0;
  const late = !credit && remaining > 0.01 && lateBy > 0;

  return {
    id: api.id,
    number: api.reference || "Sans numéro",
    entity_id: api.issuer,
    customer_id: api.customer_id,
    customer_name: api.customer_name,
    project_id: api.project_id,
    customer_entity_id: null,
    label: api.label,
    kind,
    issued_at: api.issued_at,
    due_at: api.due_at,
    amount_ht: sign * ht,
    vat_rate: num(api.vat_rate),
    amount_vat: round(sign * (ttc - ht)),
    amount_ttc: sign * ttc,
    paid_amount: paid,
    remaining,
    status: api.amount_ttc === null && !credit ? "emise" : statusOf(credit, remaining, paid, late),
    days_late: late ? lateBy : 0,
    unpriced: api.amount_ttc === null,
    marked_received: api.marked_received,
    payments: api.payments,
  };
}

/**
 * Le retard prime sur le règlement partiel : une facture échue à moitié payée
 * est en retard, et c'est ce que l'on veut voir.
 */
function statusOf(credit: boolean, remaining: number, paid: number, late: boolean): InvoiceStatus {
  if (credit) return "avoir";
  if (remaining <= 0.01) return "reglee";
  if (late) return "retard";
  if (paid > 0.01) return "partielle";
  return "emise";
}
