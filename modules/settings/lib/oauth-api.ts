import { apiFetch } from "@/shared/api/client";

/**
 * Le connecteur d'assistant, en OAuth.
 *
 * Seules les routes que le CRM appelle lui-même vivent ici : le consentement,
 * et la gestion de ce qui est branché. L'enregistrement du client et l'échange
 * du code sont appelés par l'assistant, jamais par cette interface.
 */

export type ConsentRequest = {
  /** Le nom que le client s'est donné en s'enregistrant. */
  client_name: string;
  /** Le compte au nom duquel on s'apprête à accorder. */
  account: string;
};

/** Qui demande, et pour quel compte — lu avant d'afficher quoi que ce soit. */
export function consentRequest(clientId: string, redirectUri: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri });
  return apiFetch<ConsentRequest>(`/v1/oauth/authorize?${query}`, { signal });
}

/** Accorde, et rend le code à renvoyer au demandeur. Appelé au clic, jamais au montage. */
export function authorizeConsent(payload: {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  can_write: boolean;
}) {
  return apiFetch<{ code: string }>("/v1/oauth/authorize", { method: "POST", body: payload });
}

export type OAuthGrant = {
  id: string;
  client_name: string;
  can_write: boolean;
  created_at: string;
  last_used_at: string | null;
};

/** Les assistants branchés sur mon compte. */
export function listGrants(signal?: AbortSignal) {
  return apiFetch<{ items: OAuthGrant[] }>("/v1/oauth/grants", { signal });
}

/** Couper un assistant. Immédiat : son jeton ne vaut plus rien à l'appel suivant. */
export function revokeGrant(id: string) {
  return apiFetch<void>(`/v1/oauth/grants/${id}`, { method: "DELETE" });
}
