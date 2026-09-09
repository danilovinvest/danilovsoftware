/** Types miroir des DTO exposés par `internal/users` côté API. */

export type WorkspaceUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_name: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * `grants_all` vaut vrai pour le rôle qui court-circuite la table des
 * permissions : son `permission_count` ne dit alors rien de ce qu'il peut
 * faire, d'où l'affichage particulier dans le panneau des rôles.
 */
export type Role = {
  slug: string;
  name: string;
  description: string;
  is_system: boolean;
  grants_all: boolean;
  rank: number;
  permission_count: number;
  user_count: number;
};

export type PermissionEntry = {
  slug: string;
  resource: string;
  action: string;
  description: string;
};

/** Ce qu'un PATCH /v1/users/{id} attend : l'API remplace la fiche entière. */
export type UserPayload = {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
};

/**
 * Une invitation en attente. Le jeton n'y figure pas : il n'est rendu qu'une
 * fois, à la création, et la base n'en garde que le condensat.
 */
export type Invitation = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_name: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
  /** Calculé par le serveur : l'horloge d'un poste ne décide pas de l'expiration. */
  expired: boolean;
};

export type InvitationPayload = {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
};

/** Réponse de la création : l'invitation, et le jeton en clair une seule fois. */
export type InvitationCreated = {
  invitation: Invitation;
  token: string;
};

/** Création et renommage d'un rôle. Le slug n'est lu qu'à la création. */
export type RolePayload = {
  slug?: string;
  name: string;
  description: string;
};

/**
 * Un jeton de connecteur MCP.
 *
 * Le secret n'y figure pas : il n'est rendu qu'une fois, à la création, et la
 * base n'en garde que le condensat — comme pour les invitations et les jetons
 * de rafraîchissement.
 */
export type McpToken = {
  id: string;
  name: string;
  /**
   * Le consentement à l'écriture, donné à la création et jamais modifié
   * ensuite : une adresse installée en lecture ne doit pas devenir une porte
   * d'écriture sans qu'on l'ait rebranchée.
   */
  can_write: boolean;
  last_used_at: string | null;
  expires_at: string;
  created_at: string;
  expired: boolean;
};

export type McpTokenCreated = {
  token: McpToken;
  /** Le secret en clair, une seule fois. */
  secret: string;
};
