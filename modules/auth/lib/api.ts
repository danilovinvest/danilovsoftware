import { apiFetch } from "@/shared/api/client";
import type { Account, SessionResponse } from "./types";

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
