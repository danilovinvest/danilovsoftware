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
