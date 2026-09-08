import { apiFetch } from "@/shared/api/client";
import type {
  ImportRun,
  Calendar,
  CalendarEvent,
  EventInput,
  GoogleAccount,
  ImportReport,
  MirrorCalendar,
  SyncRun,
} from "./types";

/**
 * Appels du module calendrier.
 *
 * Le CRM est maître de son agenda : tout ce qui suit vit dans sa base. Google
 * n'apparaît que sous `/mirror` et `/import` — une source qu'on interroge quand
 * on le demande, plus un dépôt dont on dépend.
 */

export function listEvents(from: Date, to: Date, signal?: AbortSignal) {
  const query = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  return apiFetch<{ items: CalendarEvent[] }>(`/v1/calendar/events?${query}`, { signal });
}

export function createEvent(input: EventInput) {
  return apiFetch<CalendarEvent>("/v1/calendar/events", { method: "POST", body: input });
}

export function updateEvent(id: string, input: EventInput) {
  return apiFetch<CalendarEvent>(`/v1/calendar/events/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteEvent(id: string) {
  return apiFetch<void>(`/v1/calendar/events/${id}`, { method: "DELETE" });
}

/**
 * Les événements rattachés à une fiche.
 *
 * La route vit sous `/v1/customers/{id}/events` et non sous `/v1/calendar` :
 * c'est une question qu'on pose à propos d'une fiche. Elle est servie par
 * l'agenda parce que c'est lui qui sait lire ses événements — la fiche n'a pas
 * à connaître ses tables.
 *
 * À venir d'abord, du plus proche au plus lointain, puis le passé récent.
 */
export function listCustomerEvents(
  customerId: string,
  limit = 20,
  signal?: AbortSignal,
) {
  return apiFetch<{ items: CalendarEvent[] }>(
    `/v1/customers/${customerId}/events?limit=${limit}`,
    { signal },
  );
}

/* --- Agendas ---------------------------------------------------------------- */

export function listCalendars(signal?: AbortSignal) {
  return apiFetch<{ items: Calendar[] }>("/v1/calendar/calendars", { signal });
}

export function createCalendar(name: string, color: number) {
  return apiFetch<Calendar>("/v1/calendar/calendars", {
    method: "POST",
    body: { name, color },
  });
}

export function updateCalendar(
  id: string,
  values: { name: string; color: number; visible: boolean },
) {
  return apiFetch<Calendar>(`/v1/calendar/calendars/${id}`, {
    method: "PATCH",
    body: values,
  });
}

export function deleteCalendar(id: string) {
  return apiFetch<void>(`/v1/calendar/calendars/${id}`, { method: "DELETE" });
}

/* --- Le miroir Google ------------------------------------------------------- */

export function listMirror(signal?: AbortSignal) {
  return apiFetch<{ items: MirrorCalendar[] }>("/v1/calendar/mirror", { signal });
}

export function listAccounts(signal?: AbortSignal) {
  return apiFetch<{ items: GoogleAccount[]; configured: boolean }>(
    "/v1/calendar/accounts",
    { signal },
  );
}

/** Le journal des imports : ce que chaque passage a repris de Google. */
export function listImportRuns(limit: number, signal?: AbortSignal) {
  return apiFetch<{ items: ImportRun[] }>(
    `/v1/calendar/import/runs?limit=${limit}`,
    { signal },
  );
}

export function listSyncRuns(limit: number, signal?: AbortSignal) {
  return apiFetch<{ items: SyncRun[] }>(`/v1/calendar/sync/runs?limit=${limit}`, {
    signal,
  });
}

/**
 * Fait passer le miroir dans l'agenda du CRM.
 *
 * Il n'ajoute que ce qu'il ne connaît pas : une correction faite ici n'est
 * jamais écrasée par la version restée chez Google. C'est ce qui le rend
 * rejouable sans faire de doublon.
 */
export function importFromGoogle() {
  return apiFetch<ImportReport>("/v1/calendar/import", { method: "POST" });
}

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
  return apiFetch<{ started: boolean }>("/v1/calendar/sync", { method: "POST" });
}

export function setMirrorSelected(id: string, accountId: string, selected: boolean) {
  return apiFetch<void>(`/v1/calendar/mirror/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { account_id: accountId, selected },
  });
}

export function disconnectAccount(id: string) {
  return apiFetch<void>(`/v1/calendar/accounts/${id}`, { method: "DELETE" });
}
