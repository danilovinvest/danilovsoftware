import { apiFetch } from "@/shared/api/client";
import type {
  DriveAccount,
  DriveListing,
  DriveRun,
  QuoteAmountsProgress,
} from "./types";

export function listAccounts(signal?: AbortSignal) {
  return apiFetch<{ items: DriveAccount[]; configured: boolean }>("/v1/files/accounts", {
    signal,
  });
}

/** L'adresse du consentement Microsoft. Le navigateur y est envoyé, pas appelé. */
export function authorizeUrl() {
  return apiFetch<{ url: string }>("/v1/files/authorize");
}

export function listRuns(limit = 20, signal?: AbortSignal) {
  return apiFetch<{ items: DriveRun[]; syncing: boolean }>(`/v1/files/runs?limit=${limit}`, {
    signal,
  });
}

/** Lance une copie. Le serveur répond tout de suite et travaille détaché. */
export function syncNow() {
  return apiFetch<{ started: boolean }>("/v1/files/sync", { method: "POST" });
}

export function setSyncEnabled(id: string, enabled: boolean) {
  return apiFetch<void>(`/v1/files/accounts/${id}`, {
    method: "PATCH",
    body: { sync_enabled: enabled },
  });
}

export function disconnect(id: string) {
  return apiFetch<void>(`/v1/files/accounts/${id}`, { method: "DELETE" });
}

/**
 * Le contenu d'un dossier.
 *
 * Rien n'est mis en cache : chaque parcours interroge Microsoft. Une
 * arborescence recopiée serait fausse dès le premier dossier créé depuis
 * l'Explorateur.
 */
export function browse(path: string, signal?: AbortSignal) {
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch<DriveListing>(`/v1/files/browse${query}`, { signal });
}

/** Où en est la lecture des montants dans les devis PDF. */
export function quoteAmountsProgress(signal?: AbortSignal) {
  return apiFetch<QuoteAmountsProgress>("/v1/files/quotes/progress", { signal });
}

/** Relancer une passe de lecture à la main. Le serveur répond avant d'avoir fini. */
export function readQuoteAmounts(limit?: number) {
  return apiFetch<{ started: boolean }>("/v1/files/quotes/read", {
    method: "POST",
    query: { limit },
  });
}
