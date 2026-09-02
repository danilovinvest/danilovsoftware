import { apiFetch } from "@/shared/api/client";
import type { CalendarListEntry, GoogleAccount, GoogleEvent, SyncRun } from "./types";

/**
 * Appels du module calendrier.
 *
 * Tout est en lecture : le CRM recopie l'agenda Google, il n'y écrit jamais.
 * Les seules écritures possibles ici portent sur le raccordement lui-même —
 * quel compte, quels agendas recopiés — et non sur son contenu.
 */

export function listEvents(from: Date, to: Date, signal?: AbortSignal) {
  const query = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  return apiFetch<{ items: GoogleEvent[] }>(`/v1/calendar/events?${query}`, { signal });
}

export function listCalendars(signal?: AbortSignal) {
  return apiFetch<{ items: CalendarListEntry[] }>("/v1/calendar/calendars", { signal });
}

export function listAccounts(signal?: AbortSignal) {
  return apiFetch<{ items: GoogleAccount[]; configured: boolean }>(
    "/v1/calendar/accounts",
    { signal },
  );
}

export function listSyncRuns(limit: number, signal?: AbortSignal) {
  return apiFetch<{ items: SyncRun[] }>(`/v1/calendar/sync/runs?limit=${limit}`, {
    signal,
  });
}

/* --- Raccordement ---------------------------------------------------------- */

/**
 * Rend l'URL de l'écran de consentement Google.
 *
 * Le navigateur y est envoyé par `window.location`, jamais par `fetch` : Google
 * refuse d'être affiché dans un cadre ou appelé depuis une autre origine, et
 * c'est bien le propre d'un écran de consentement — il doit se voir.
 */
export async function authorizeUrl() {
  const { url } = await apiFetch<{ url: string }>("/v1/calendar/google/authorize", {
    method: "POST",
  });
  return url;
}

export function syncNow() {
  return apiFetch<{ items: CalendarListEntry[] }>("/v1/calendar/sync", { method: "POST" });
}

export function setCalendarSelected(id: string, accountId: string, selected: boolean) {
  return apiFetch<void>(`/v1/calendar/calendars/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { account_id: accountId, selected },
  });
}

export function disconnectAccount(id: string) {
  return apiFetch<void>(`/v1/calendar/accounts/${id}`, { method: "DELETE" });
}
