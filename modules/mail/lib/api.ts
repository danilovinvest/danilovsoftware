import { apiFetch, apiFetchBlob } from "@/shared/api/client";
import type {
  BrowseMessage,
  MailAccount,
  MailAttachment,
  MailMessage,
  MailPage,
  MailRun,
  MailKind,
  MailScope,
  UnknownSender,
  AttachResult,
} from "./types";

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

/** Parcourir la boîte entière, et non plus seulement le courrier d'une fiche. */
export function browseMail(
  params: {
    search?: string;
    scope?: MailScope;
    kind?: MailKind;
    from?: string;
    page?: number;
    /** Absent = toutes les boîtes raccordées. */
    account?: string;
  },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams();
  if (params.account) query.set("account", params.account);
  if (params.search) query.set("search", params.search);
  if (params.scope && params.scope !== "tous") query.set("scope", params.scope);
  if (params.kind && params.kind !== "tous") query.set("kind", params.kind);
  if (params.from) query.set("from", params.from);
  query.set("page", String(params.page ?? 1));
  query.set("per_page", "50");
  return apiFetch<MailPage>(`/v1/mail/messages?${query}`, { signal });
}

/**
 * Un message et son corps.
 *
 * Le serveur rapatrie le corps s'il n'est pas encore en base : l'appel peut
 * donc prendre une seconde la première fois, le temps d'une connexion IMAP.
 */
export function getMessage(id: string, signal?: AbortSignal) {
  return apiFetch<BrowseMessage>(`/v1/mail/messages/${id}`, { signal });
}

export function setCopyAll(accountId: string, copyAll: boolean) {
  return apiFetch<void>(`/v1/mail/accounts/${accountId}`, {
    method: "PATCH",
    body: { copy_all: copyAll },
  });
}

export function listCustomerMail(customerId: string, limit = 100, signal?: AbortSignal) {
  return apiFetch<{ items: MailMessage[]; total: number }>(
    `/v1/customers/${customerId}/mail?limit=${limit}`,
    { signal },
  );
}

/**
 * Retire un courriel d'une fiche.
 *
 * Le message n'est pas supprimé — il reste dans la boîte et dans l'écran
 * Messagerie. Ce qui disparaît, c'est le rapprochement, et le serveur le note
 * pour que la copie suivante ne le refasse pas toute seule.
 */
/**
 * Rattache des courriels à une fiche, et retient l'adresse de l'expéditeur si
 * on le demande. C'est le geste qui apprend : un clic par interlocuteur, et
 * son passé comme son avenir suivent par clé exacte.
 */
export function attachCustomerMail(customerId: string, ids: string[], rememberSender: boolean) {
  return apiFetch<AttachResult>(`/v1/customers/${customerId}/mail/attach`, {
    method: "POST",
    body: { ids, remember_sender: rememberSender },
  });
}

export function detachCustomerMail(customerId: string, messageId: string) {
  return apiFetch<void>(`/v1/customers/${customerId}/mail/${messageId}`, {
    method: "DELETE",
  });
}

/**
 * Retire plusieurs courriels d'une fiche, ou tous.
 *
 * `all` est un champ à part et non « une liste vide veut dire tout » : la
 * distinction entre « je n'ai rien coché » et « je veux tout retirer » ne doit
 * tenir à rien d'implicite quand le second vide une fiche de huit mille
 * messages.
 */
export function detachCustomerMailMany(
  customerId: string,
  selection: { ids?: string[]; all?: boolean },
) {
  return apiFetch<{ detached: number }>(`/v1/customers/${customerId}/mail/detach`, {
    method: "POST",
    body: selection,
  });
}

export function listAttachments(messageId: string, signal?: AbortSignal) {
  return apiFetch<{ items: MailAttachment[] }>(
    `/v1/mail/messages/${messageId}/attachments`,
    { signal },
  );
}

/**
 * Le contenu d'une pièce jointe.
 *
 * Par `fetch`, et non par un lien : la route exige le jeton d'accès, qu'un
 * `<a href>` ne porte pas — le clic rendait 401 (issue 61). Une pièce trop
 * lourde pour avoir été copiée répond 404, avec une phrase qui le dit.
 */
export function fetchAttachment(id: string, signal?: AbortSignal) {
  return apiFetchBlob(`/v1/mail/attachments/${id}`, { signal });
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
