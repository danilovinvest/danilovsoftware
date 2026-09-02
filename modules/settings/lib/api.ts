import { apiFetch, type Paginated } from "@/shared/api/client";
import type {
  Invitation,
  InvitationCreated,
  InvitationPayload,
  PermissionEntry,
  Role,
  UserPayload,
  WorkspaceUser,
} from "./types";

/** Toutes les requêtes du module passent par ici : un seul endroit à relire. */

export function listUsers(
  params: { search?: string; page?: number; per_page?: number },
  signal?: AbortSignal,
) {
  return apiFetch<Paginated<WorkspaceUser>>("/v1/users", {
    query: {
      search: params.search,
      page: params.page,
      per_page: params.per_page,
    },
    signal,
  });
}

/*
 * Rôles et permissions ne sont pas paginés côté API : les deux tiennent en une
 * poignée de lignes et arrivent sous `{ items: [...] }`.
 */

export function listRoles(signal?: AbortSignal) {
  return apiFetch<{ items: Role[] }>("/v1/roles", { signal });
}

export function listPermissions(signal?: AbortSignal) {
  return apiFetch<{ items: PermissionEntry[] }>("/v1/permissions", { signal });
}

/**
 * Modifie un compte. L'API impose la règle de rang — on n'agit que sur un
 * compte de rang strictement inférieur au sien — et refuse par un 403 sinon :
 * masquer le bouton côté front n'est qu'un confort, pas la protection.
 */
export function updateUser(id: string, payload: UserPayload) {
  return apiFetch<WorkspaceUser>(`/v1/users/${id}`, { method: "PATCH", body: payload });
}

export function listInvitations(signal?: AbortSignal) {
  return apiFetch<{ items: Invitation[] }>("/v1/invitations", { signal });
}

/** Le jeton rendu ici ne le sera jamais plus : c'est au front de composer le lien. */
export function createInvitation(payload: InvitationPayload) {
  return apiFetch<InvitationCreated>("/v1/invitations", { method: "POST", body: payload });
}

export function revokeInvitation(id: string) {
  return apiFetch<void>(`/v1/invitations/${id}`, { method: "DELETE" });
}

/**
 * Le lien que l'on copie. Il pointe vers le front, pas vers l'API : c'est le
 * front qui sert la page d'acceptation, et lui seul connaît son origine — la
 * faire deviner au serveur demanderait un réglage de plus à tenir à jour.
 */
export function invitationUrl(token: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/invitation/${token}`;
}
