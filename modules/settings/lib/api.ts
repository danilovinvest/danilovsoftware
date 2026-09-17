import { apiFetch, type Paginated } from "@/shared/api/client";
import { apiBase } from "@/shared/lib/env";
import type {
  Invitation,
  McpToken,
  McpTokenCreated,
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

/* --- Enrôler une clé d'accès ---------------------------------------------- */

/*
 * Une clé d'accès ne s'envoie pas : sa moitié privée naît dans l'appareil de
 * son porteur. Ce qui s'envoie, c'est un lien à usage unique qui laisse la
 * personne en créer une — sur son téléphone, où la clé doit vivre.
 *
 * Les trois routes d'administration vivent sous `/v1/auth/passkeys` parce
 * qu'elles parlent de clés, et sont gardées par `users:write` parce qu'elles
 * parlent d'un compte qui n'est pas forcément le sien.
 */

export function createPasskeyEnrollment(userId: string) {
  return apiFetch<{ enrollment: PasskeyEnrollment; token: string }>(
    "/v1/auth/passkeys/enrollments",
    { method: "POST", body: { user_id: userId } },
  );
}

export function listPasskeyEnrollments(signal?: AbortSignal) {
  return apiFetch<{ items: PasskeyEnrollment[] }>("/v1/auth/passkeys/enrollments", {
    signal,
  });
}

export function revokePasskeyEnrollment(id: string) {
  return apiFetch<void>(`/v1/auth/passkeys/enrollments/${id}`, { method: "DELETE" });
}

/** Combien de clés par compte. Un compte absent de la liste n'en a aucune. */
export function passkeyCoverage(signal?: AbortSignal) {
  return apiFetch<{ items: Array<{ user_id: string; keys: number }> }>(
    "/v1/auth/passkeys/coverage",
    { signal },
  );
}

/*
 * L'adresse du lien, construite sur l'origine de la page.
 *
 * Elle est lue **à l'appel** et jamais au chargement du module : le portail et
 * les deux CRM sont trois hôtes, et un lien figé à la compilation enverrait la
 * personne sur celui qui n'est pas le sien. La clé, elle, vaut pour les trois —
 * le RPID est l'apex.
 */
export function passkeyEnrollUrl(token: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/cle/${token}`;
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

/**
 * Change le rôle d'un compte, et rien d'autre.
 *
 * Passer par `updateUser` obligerait à renvoyer la fiche entière — nom, adresse,
 * statut — et écraserait toute modification concurrente. L'API applique les
 * mêmes garde-fous : rang de la cible, rang du rôle attribué, dernier dirigeant.
 */
/**
 * Ranger un compte dans sa société.
 *
 * Sa propre route, comme le rôle : `updateUser` remplace la ligne entière et
 * n'emporte pas la société — corriger une faute de frappe dans un prénom
 * l'effacerait. Le changement révoque les sessions de la personne, la société
 * voyageant dans le jeton d'accès.
 */
export function setUserCompany(id: string, issuer: string) {
  return apiFetch<WorkspaceUser>(`/v1/users/${id}/issuer`, {
    method: "PUT",
    body: { issuer },
  });
}

export function setUserRole(id: string, role: string) {
  return apiFetch<WorkspaceUser>(`/v1/users/${id}/role`, {
    method: "PUT",
    body: { role },
  });
}

/* --- Connecteur MCP -------------------------------------------------------- */

export function listMcpTokens(signal?: AbortSignal) {
  return apiFetch<{ items: McpToken[] }>("/v1/mcp/tokens", { signal });
}

/**
 * Crée une adresse de connecteur.
 *
 * `canWrite` est le **consentement**, distinct des permissions du compte :
 * écrire depuis l'assistant demande les deux. Il est figé à la création — une
 * adresse déjà installée dans ChatGPT ne doit pas changer de nature en cours de
 * route, sinon le connecteur qu'on a branché en lecture pourrait modifier des
 * fiches sans qu'on l'ait rebranché.
 */
export function createMcpToken(name: string, canWrite: boolean) {
  return apiFetch<McpTokenCreated>("/v1/mcp/tokens", {
    method: "POST",
    body: { name, can_write: canWrite },
  });
}

export function revokeMcpToken(id: string) {
  return apiFetch<void>(`/v1/mcp/tokens/${id}`, { method: "DELETE" });
}

/**
 * L'URL à coller dans l'assistant.
 *
 * Le secret est le dernier segment du chemin : ChatGPT ne sait présenter ni
 * clé d'API ni en-tête personnalisé pour un connecteur, seulement une URL — ou
 * un vrai parcours OAuth, qui viendra ensuite.
 *
 * Elle pointe vers l'API et non vers le front : c'est le serveur Go qui parle
 * MCP. Les deux partagent le domaine en production ; en développement le front
 * tourne sur un autre port, d'où la lecture de `NEXT_PUBLIC_API_URL`.
 */
export function mcpConnectorUrl(secret: string): string {
  return `${apiBase()}/mcp/${secret}`;
}
