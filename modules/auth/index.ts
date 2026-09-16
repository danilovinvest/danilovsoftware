export { AuthProvider, useAuth, usePermission } from "./auth-context";
export { LoginForm } from "./components/login-form";
export { PasskeyLoginButton } from "./components/passkey-login-button";
export { InvitationForm } from "./components/invitation-form";
export { RequireAuth } from "./components/require-auth";
export type {
  Account,
  DeviceSession,
  InvitationPreview,
  Passkey,
  Permission,
  RoleSlug,
} from "./lib/types";
/*
 * Les clés d'accès : la cérémonie reste dans ce module.
 *
 * Les réglages demandent « enregistre une clé », pas « commence une cérémonie,
 * traduis deux champs de base64url, puis termine-la » — le protocole est
 * l'affaire du module d'authentification.
 */
export {
  ceremonyCancelled,
  passkeysSupported,
  registerPasskey,
} from "./lib/passkeys";
export { deletePasskey, listPasskeys, renamePasskey } from "./lib/api";
// Opérations d'un compte sur lui-même, consommées par le module réglages.
export {
  changePassword,
  listSessions,
  logoutAll,
  revokeSession,
  updateProfile,
} from "./lib/api";
