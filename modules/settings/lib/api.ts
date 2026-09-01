import { apiFetch, type Paginated } from "@/shared/api/client";
import type { PermissionEntry, Role, WorkspaceUser } from "./types";

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
