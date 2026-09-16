import { apiFetch } from "@/shared/api/client";
import type {
  Account,
  DeviceSession,
  InvitationPreview,
  Passkey,
  PasskeyChallenge,
  SessionResponse,
} from "./types";

export function login(email: string, password: string) {
  return apiFetch<SessionResponse>("/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function logout() {
  return apiFetch<void>("/v1/auth/logout", { method: "POST" });
}

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
 * Deux temps par cérémonie, et le défi fait l'aller-retour.
 *
 * Le serveur ne garde rien entre les deux : le défi revient scellé, signé par
 * lui, ce qui lui évite une table de défis à écrire puis à purger à chaque
 * tentative — y compris les tentatives abandonnées, qui sont la majorité.
 */

export function beginPasskeyLogin() {
  return apiFetch<PasskeyChallenge>("/v1/auth/passkey/login/begin", {
    method: "POST",
  });
}

/** Ouvre la session : la réponse est celle d'une connexion, cookie compris. */
export function finishPasskeyLogin(challenge: string, credential: unknown) {
  return apiFetch<SessionResponse>("/v1/auth/passkey/login/finish", {
    method: "POST",
    body: { challenge, credential },
  });
}

export function beginPasskeyRegistration() {
  return apiFetch<PasskeyChallenge>("/v1/auth/passkey/register/begin", {
    method: "POST",
  });
}

export function finishPasskeyRegistration(
  challenge: string,
  credential: unknown,
  name: string,
) {
  return apiFetch<Passkey>("/v1/auth/passkey/register/finish", {
    method: "POST",
    body: { challenge, credential, name },
  });
}

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

/* --- Invitations ---------------------------------------------------------- */

/** Route publique : elle ne demande aucun jeton d'accès. */
export function previewInvitation(token: string, signal?: AbortSignal) {
  return apiFetch<InvitationPreview>(
    `/v1/auth/invitation/${encodeURIComponent(token)}`,
    { signal },
  );
}

/**
 * Accepte le lien et ouvre la session dans la foulée : le compte vient d'être
 * créé et l'invité a choisi son mot de passe, lui demander de se connecter
 * juste après serait un pas de plus pour rien.
 */
export function acceptInvitation(
  token: string,
  payload: { first_name: string; last_name: string; password: string },
) {
  return apiFetch<SessionResponse>(
    `/v1/auth/invitation/${encodeURIComponent(token)}/accept`,
    { method: "POST", body: payload },
  );
}
