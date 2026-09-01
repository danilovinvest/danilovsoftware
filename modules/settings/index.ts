/**
 * Surface publique du module « réglages ». Les autres modules et les routes de
 * l'app n'importent que d'ici, jamais d'un fichier interne.
 */
export { SettingsNav } from "./components/settings-nav";
export { ProfilePanel } from "./components/profile-panel";
export { ExperiencePanel } from "./components/experience-panel";
export { GeneralPanel } from "./components/general-panel";
export { MembersPanel } from "./components/members-panel";
export { RolesPanel } from "./components/roles-panel";
export { SETTINGS_NAVIGATION, settingsLabel } from "./lib/navigation";
export type { PermissionEntry, Role, WorkspaceUser } from "./lib/types";
