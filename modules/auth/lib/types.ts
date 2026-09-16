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
  | "calendar:read"
  | "calendar:write"
  | "mail:read"
  | "mail:write"
  | "automations:read"
  | "automations:write"
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
 * Une passkey enregistrée, telle que les réglages l'affichent.
 *
 * Ni la clé publique ni l'identifiant de la clé n'en font partie : ils ne
 * servent qu'à la cérémonie, et un écran n'a rien à en faire. `synced` se lit de
 * l'état de sauvegarde — la clé existe ailleurs que sur cet appareil, donc le
 * perdre ne perd pas l'accès, et c'est la seule chose qu'il faut savoir.
 */
export type Passkey = {
  id: string;
  name: string;
  transports: string[];
  synced: boolean;
  last_used_at: string | null;
  created_at: string;
};

/**
 * Le début d'une cérémonie : ce que le navigateur doit demander à
 * l'authentificateur, et le défi scellé à renvoyer tel quel.
 *
 * `options` n'est pas retypé champ par champ : c'est le protocole WebAuthn, le
 * serveur le produit déjà dans la forme attendue, et en tenir une seconde
 * définition ici la ferait diverger à la première mise à jour.
 */
export type PasskeyChallenge = {
  options: { publicKey: Record<string, unknown> };
  challenge: string;
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

/**
 * Ce qu'un visiteur non authentifié peut lire d'un lien d'invitation.
 *
 * L'adresse est masquée (« c•••@exemple.fr ») : elle confirme au destinataire
 * que le lien lui est destiné sans livrer d'adresse à qui l'aurait intercepté.
 * Un jeton inconnu, expiré, révoqué ou déjà consommé rend tous la même 404 —
 * les distinguer révélerait qu'une invitation a existé.
 */
export type InvitationPreview = {
  email_hint: string;
  first_name: string;
  last_name: string;
  role_name: string;
  expires_at: string;
};
