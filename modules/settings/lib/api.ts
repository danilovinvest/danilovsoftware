import { apiFetch, type Paginated } from "@/shared/api/client";
import type {
  Invitation,
  InvitationCreated,
  InvitationPayload,
  PermissionEntry,
  Role,
  RolePayload,
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

/* --- Rôles ---------------------------------------------------------------- */

/**
 * Un rôle créé ici naît sans aucune permission : l'API refuse d'en hériter
 * quoi que ce soit du créateur. On le crée, puis on coche.
 */
export function createRole(payload: RolePayload) {
  return apiFetch<Role>("/v1/roles", { method: "POST", body: payload });
}

/** Seuls le nom et la description changent : le slug est immuable côté API. */
export function updateRole(slug: string, payload: RolePayload) {
  return apiFetch<Role>(`/v1/roles/${slug}`, { method: "PATCH", body: payload });
}

export function deleteRole(slug: string) {
  return apiFetch<void>(`/v1/roles/${slug}`, { method: "DELETE" });
}

export function getRolePermissions(slug: string, signal?: AbortSignal) {
  return apiFetch<{ items: string[] }>(`/v1/roles/${slug}/permissions`, { signal });
}

/**
 * Remplace l'intégralité des permissions du rôle — l'API ne connaît pas les
 * ajouts partiels, elle purge et réécrit en une transaction.
 */
export function setRolePermissions(slug: string, permissions: string[]) {
  return apiFetch<{ items: string[] }>(`/v1/roles/${slug}/permissions`, {
    method: "PUT",
    body: { permissions },
  });
}
