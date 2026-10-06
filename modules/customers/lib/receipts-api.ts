import { apiFetch } from "@/shared/api/client";
import type { Quote } from "./types";
import type {
  AllocationPayload,
  BankAccount,
  CreditNotePayload,
  PaymentPart,
  ReceiptPayload,
} from "./receipt-types";

/** Les comptes de l'entreprise, fermés compris. */
export function listBankAccounts(signal?: AbortSignal) {
  return apiFetch<BankAccount[]>("/v1/bank-accounts", { signal });
}

/** Les encaissements en attente d'affectation, dans le périmètre du compte. */
export function listPendingReceipts(signal?: AbortSignal) {
  return apiFetch<PaymentPart[]>("/v1/payments/pending", { signal });
}

/**
 * Inscrire un virement : ses parts sur des pièces, le reste en attente. Sans
 * aucune part, tout le virement attend son affectation.
 */
export function recordReceipt(payload: ReceiptPayload) {
  return apiFetch<Quote[]>("/v1/payments", { method: "POST", body: payload });
}

/** Affecter tout ou partie d'un encaissement en attente. */
export function allocateReceipt(id: string, allocations: AllocationPayload[]) {
  return apiFetch<Quote[]>(`/v1/payments/pending/${id}/allocate`, {
    method: "POST",
    body: { allocations },
  });
}

/** Retirer un encaissement en attente saisi par erreur. */
export function removePendingReceipt(id: string) {
  return apiFetch<void>(`/v1/payments/pending/${id}`, { method: "DELETE" });
}

/**
 * Le compte crédité d'un virement, sur toutes ses lignes. `null` le retire :
 * « pas encore dit » redevient possible.
 */
export function setPaymentBankAccount(paymentId: string, bankAccountId: string | null) {
  return apiFetch<{ lines: number }>(`/v1/payments/${paymentId}`, {
    method: "PATCH",
    body: { set_bank_account: true, bank_account_id: bankAccountId },
  });
}

/** Émettre un avoir sur une facture : il réduit son net à payer. */
export function issueCreditNote(invoiceId: string, payload: CreditNotePayload) {
  return apiFetch<Quote>(`/v1/quotes/${invoiceId}/credit-note`, { method: "POST", body: payload });
}
