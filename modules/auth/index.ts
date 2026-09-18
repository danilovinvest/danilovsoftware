export { AuthProvider, useAuth, usePermission } from "./auth-context";
export { LoginForm } from "./components/login-form";
export { PasskeyLoginButton } from "./components/passkey-login-button";
export { RequireAuth } from "./components/require-auth";
export type {
  Account,
  DeviceSession,
  Passkey,
  Permission,
  RoleSlug,
} from "./lib/types";
/*
 * Les clés d'accès. Aucune cérémonie WebAuthn ne vit dans l'application : une
 * clé ne se signe que sur le domaine du CRM, donc dans un navigateur. L'écran
 * les liste, les renomme, les retire, et émet le lien qui en crée une.
 */
export {
  createMyPasskeyEnrollment,
  deletePasskey,
  listPasskeys,
  renamePasskey,
} from "./lib/api";
// Opérations d'un compte sur lui-même, consommées par le module réglages.
export {
  changePassword,
  listSessions,
  logoutAll,
  revokeSession,
  updateProfile,
} from "./lib/api";
