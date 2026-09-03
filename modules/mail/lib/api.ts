import { apiFetch } from "@/shared/api/client";
import { API_URL } from "@/shared/lib/env";
import type { MailAccount, MailAttachment, MailMessage, MailRun, UnknownSender } from "./types";

export function listAccounts(signal?: AbortSignal) {
  return apiFetch<{ items: MailAccount[]; syncing: boolean }>("/v1/mail/accounts", { signal });
}

export function listRuns(limit = 30, signal?: AbortSignal) {
  return apiFetch<{ items: MailRun[] }>(`/v1/mail/runs?limit=${limit}`, { signal });
}

export function listUnknownSenders(minimum = 2, limit = 50, signal?: AbortSignal) {
  return apiFetch<{ items: UnknownSender[] }>(
    `/v1/mail/unknown?minimum=${minimum}&limit=${limit}`,
    { signal },
  );
}

export function listCustomerMail(customerId: string, signal?: AbortSignal) {
  return apiFetch<{ items: MailMessage[] }>(`/v1/customers/${customerId}/mail`, { signal });
}

export function listAttachments(messageId: string, signal?: AbortSignal) {
  return apiFetch<{ items: MailAttachment[] }>(
    `/v1/mail/messages/${messageId}/attachments`,
    { signal },
  );
}

/**
 * L'adresse d'une pièce jointe.
 *
 * Elle pointe vers l'API et non vers le front, et n'est pas un `fetch` : c'est
 * le navigateur qui télécharge, avec le nom de fichier que le serveur donne.
 */
export function attachmentUrl(id: string): string {
  return `${API_URL}/v1/mail/attachments/${id}`;
}

export type ConnectInput = {
  email: string;
  password: string;
  host: string;
  port: number;
  months: number;
};

export function connectMailbox(input: ConnectInput) {
  return apiFetch<{ email: string; started: boolean }>("/v1/mail/accounts", {
    method: "POST",
    body: input,
  });
}

export function disconnectMailbox(id: string) {
  return apiFetch<void>(`/v1/mail/accounts/${id}`, { method: "DELETE" });
}

export function syncNow() {
  return apiFetch<{ started: boolean }>("/v1/mail/sync", { method: "POST" });
}
