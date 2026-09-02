export { AuthProvider, useAuth, usePermission } from "./auth-context";
export { LoginForm } from "./components/login-form";
export { InvitationForm } from "./components/invitation-form";
export { RequireAuth } from "./components/require-auth";
export type {
  Account,
  DeviceSession,
  InvitationPreview,
  Permission,
  RoleSlug,
} from "./lib/types";
// Opérations d'un compte sur lui-même, consommées par le module réglages.
export {
  changePassword,
  listSessions,
  logoutAll,
  revokeSession,
  updateProfile,
} from "./lib/api";
