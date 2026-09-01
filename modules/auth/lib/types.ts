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
  | "teams:read"
  | "teams:write"
  | "tasks:read"
  | "tasks:write"
  | "tasks:delete"
  | "imports:run"
  | "system:admin";

/**
 * Identifiant de rôle. Volontairement une chaîne libre : les rôles sur mesure
 * sont créés en base, une union fermée deviendrait fausse au premier rôle
 * ajouté. Le libellé lisible arrive dans `role_name`, jamais reconstitué ici.
 */
export type RoleSlug = string;

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


/**
 * Un appareil connecté, tel que listé dans les réglages.
 *
 * La rotation des refresh tokens ne laisse qu'une ligne vivante par chaîne :
 * une session = un appareil, et `last_seen_at` est l'instant du dernier
 * renouvellement, donc la dernière activité réelle.
 */
export type DeviceSession = {
  id: string;
  user_agent: string;
  ip_address: string;
  last_seen_at: string;
  expires_at: string;
  /** Vrai pour l'appareil qui consulte la liste. */
  current: boolean;
};
