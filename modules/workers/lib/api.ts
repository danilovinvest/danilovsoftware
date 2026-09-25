import { apiFetch } from "@/shared/api/client";
import type { PortalState, Worker, WorkerMonth, WorkerStatus } from "./types";

/** L'équipe. `archives` inclut ceux qui l'ont quittée. */
export function listWorkers(archives = false, signal?: AbortSignal) {
  return apiFetch<{ items: Worker[] }>(
    `/v1/workers${archives ? "?archives=1" : ""}`,
    { signal },
  );
}

/** La grille d'un mois, en AAAA-MM. Vide, le serveur prend le mois courant. */
export function getMonth(mois: string, signal?: AbortSignal) {
  return apiFetch<WorkerMonth>(
    `/v1/workers/attendance${mois ? `?mois=${mois}` : ""}`,
    { signal },
  );
}

export function createWorker(full_name: string) {
  return apiFetch<Worker>("/v1/workers", {
    method: "POST",
    body: JSON.stringify({ full_name }),
  });
}

/** Renommer ou réordonner. Un champ omis garde sa valeur. */
export function updateWorker(id: string, patch: { full_name?: string; position?: number }) {
  return apiFetch<Worker>(`/v1/workers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** Ranger un ouvrier hors de l'équipe, ou l'y remettre. */
export function archiveWorker(id: string, archived: boolean) {
  return apiFetch<Worker>(`/v1/workers/${id}/archive`, {
    method: "PUT",
    body: JSON.stringify({ archived }),
  });
}

/**
 * Effacer pour de bon. Le serveur refuse dès qu'un pointage existe : c'est
 * réservé à une ligne créée par erreur, avant qu'elle n'ait servi.
 */
export function deleteWorker(id: string) {
  return apiFetch<void>(`/v1/workers/${id}`, { method: "DELETE" });
}

/**
 * Poser ou corriger une case. Un statut vide rend le jour à « non saisi » :
 * « absent » et « pas encore pointé » ne sont pas la même chose.
 */
export function markAttendance(id: string, day: string, status: WorkerStatus | "") {
  return apiFetch<void>(`/v1/workers/${id}/attendance`, {
    method: "PUT",
    body: JSON.stringify({ day, status }),
  });
}

export function getPortalState(signal?: AbortSignal) {
  return apiFetch<PortalState>("/v1/workers/portal", { signal });
}

/**
 * Changer le secret de l'écran de chantier.
 *
 * Le geste ferme aussi les tablettes restées connectées : le sceau de session
 * porte la date de mise en vigueur du secret, et le serveur la compare à
 * chaque appel. C'est ce que l'écran doit dire avant le clic.
 */
export function setPortalPassword(password: string) {
  return apiFetch<PortalState>("/v1/workers/portal/password", {
    method: "PUT",
    body: JSON.stringify({ password }),
  });
}
