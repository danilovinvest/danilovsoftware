import { apiFetch } from "@/shared/api/client";
import type { AttendanceDay, Worker } from "./types";

/**
 * L'écran de chantier, côté réseau.
 *
 * **Le même client HTTP que le reste du CRM, avec une option en moins.**
 * `retryOnUnauthorized: false` empêche `apiFetch` de tenter un renouvellement
 * de session sur un 401 : il n'y a pas de session de CRM ici, seulement le
 * cookie scellé du pointage, et l'appel à `/v1/auth/refresh` ne ferait que du
 * bruit sur un hôte qui n'en a que faire. Un 401 veut dire « écran verrouillé »,
 * et c'est exactement ce que l'écran doit afficher.
 *
 * Le cookie part parce que `apiFetch` envoie les identifiants et que la page
 * appelle l'API de **sa propre origine** : aucune requête inter-origines,
 * aucun CORS avec identifiants.
 */

export type Pointage = {
  /** AAAA-MM-JJ, décidé par le serveur dans le fuseau de l'entreprise. */
  day: string;
  workers: Worker[];
  attendance: AttendanceDay[];
};

/** Échange le mot de passe partagé contre la session de l'écran. */
export function unlock(password: string) {
  return apiFetch<{ ok: boolean }>("/v1/pointage/session", {
    method: "POST",
    body: JSON.stringify({ password }),
    retryOnUnauthorized: false,
  });
}

export function lock() {
  return apiFetch<void>("/v1/pointage/session", {
    method: "DELETE",
    retryOnUnauthorized: false,
  });
}

/** L'équipe et le pointage du jour. Rien d'autre : ni mois, ni totaux. */
export function today(signal?: AbortSignal) {
  return apiFetch<Pointage>("/v1/pointage", { signal, retryOnUnauthorized: false });
}

/**
 * Pointer quelqu'un pour aujourd'hui.
 *
 * Le jour n'est pas envoyé : le serveur le décide. Laisser la tablette le
 * choisir permettrait de réécrire un mois clos depuis un écran qui n'a ni
 * compte ni permission.
 */
export function mark(workerId: string, status: "present" | "absent" | "") {
  return apiFetch<AttendanceDay | void>(`/v1/pointage/${workerId}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
    retryOnUnauthorized: false,
  });
}
