/** Permissions telles que définies côté API (table permissions). */
export type Permission =
  | "customers:read"
  | "customers:write"
  | "customers:delete"
  | "customers:export"
  | "quotes:read"
  | "quotes:write"
  | "quotes:delete"
  | "users:read"
  | "users:write"
  | "users:delete"
  | "roles:read"
  | "roles:write"
  | "imports:run"
  | "system:admin";

export type RoleSlug = "user" | "admin" | "developer";

export type Account = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: RoleSlug;
  role_name: string;
  is_active: boolean;
  permissions: Permission[];
  last_login_at: string | null;
  created_at: string;
};

export type SessionResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: Account;
};

export const ROLE_LABELS: Record<RoleSlug, string> = {
  user: "Utilisateur",
  admin: "Administrateur",
  developer: "Développeur",
};
