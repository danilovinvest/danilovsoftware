import { apiFetch } from "@/shared/api/client";
import type { Account, DeviceSession, Passkey } from "./types";

// Se connecter et se déconnecter passent par la coque, qui garde le refresh
// token : voir `shared/desktop/session.ts`. Les routes à cookie de l'API
// n'ont aucun sens depuis `tauri://localhost`.

export function me() {
  return apiFetch<Account>("/v1/auth/me");
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<void>("/v1/auth/password", {
    method: "POST",
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

/** Seule écriture qu'un compte peut faire sur lui-même : son nom d'affichage. */
export function updateProfile(firstName: string, lastName: string) {
  return apiFetch<Account>("/v1/auth/me", {
    method: "PATCH",
    body: { first_name: firstName, last_name: lastName },
  });
}

export function listSessions() {
  return apiFetch<{ items: DeviceSession[] }>("/v1/auth/sessions");
}

export function revokeSession(id: string) {
  return apiFetch<void>(`/v1/auth/sessions/${id}`, { method: "DELETE" });
}

/** Ferme toutes les sessions, y compris celle qui appelle. */
export function logoutAll() {
  return apiFetch<void>("/v1/auth/logout-all", { method: "POST" });
}

/* --- Passkeys ------------------------------------------------------------- */

/*
 * Aucune cérémonie WebAuthn ici : une clé ne se signe que sur le domaine du CRM,
 * donc dans le navigateur du système — la connexion passe par la coque
 * (`shared/desktop/session.ts`), la création par un lien d'enrôlement. Restent
 * la liste et ce qu'on fait d'une clé existante.
 */

export function listPasskeys(signal?: AbortSignal) {
  return apiFetch<{ items: Passkey[]; configured: boolean }>("/v1/auth/passkeys", {
    signal,
  });
}

export function renamePasskey(id: string, name: string) {
  return apiFetch<void>(`/v1/auth/passkeys/${id}`, {
    method: "PATCH",
    body: { name },
  });
}

export function deletePasskey(id: string) {
  return apiFetch<void>(`/v1/auth/passkeys/${id}`, { method: "DELETE" });
}

/*
 * Un lien d'enrôlement **pour soi-même**, sous simple session.
 *
 * C'est ce que l'accueil d'un nouvel arrivant affiche en QR code : il crée son
 * compte sur un ordinateur, sa clé doit naître dans son téléphone, et le
 * téléphone n'a pas de session. Émettre pour autrui demande `users:write` ; pour
 * soi, non — s'attribuer une façon d'entrer n'est pas gérer des comptes.
 *
 * Le type de retour n'est pas partagé avec le module des réglages : seul le
 * jeton sert ici, et importer le type d'un autre module pour deux champs en
 * ferait une dépendance qu'aucun des deux ne veut.
 */
export function createMyPasskeyEnrollment() {
  return apiFetch<{ token: string }>("/v1/auth/passkeys/enrollments/me", {
    method: "POST",
  });
}
