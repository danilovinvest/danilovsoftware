import { apiFetch } from "@/shared/api/client";
import type { Account, DeviceSession, SessionResponse } from "./types";

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
