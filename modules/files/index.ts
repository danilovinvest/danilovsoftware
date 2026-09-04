/**
 * Surface publique du module « fichiers ». Les routes de l'app et les autres
 * modules n'importent que d'ici.
 */
export { FilesPanel } from "./components/files-panel";
export { DriveExplorer } from "./components/drive-explorer";
export { DeveloperView } from "./components/developer-view";
export { parseFolder, looksLikeDeal } from "./lib/parse";
export * from "./lib/types";
