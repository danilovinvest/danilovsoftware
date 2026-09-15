/**
 * Surface publique du module « fichiers ». Les routes de l'app et les autres
 * modules n'importent que d'ici.
 */
export { FilesPanel } from "./components/files-panel";
export { DriveExplorer } from "./components/drive-explorer";
export { CustomerDocuments } from "./components/customer-documents";
// Le parcours d'un dossier sert aussi à joindre une preuve à un cran de la frise.
export { browse } from "./lib/api";
export { useDriveRuns } from "./hooks/use-drive";
export { OneDriveView } from "./components/onedrive-view";
export { parseFolder, looksLikeDeal } from "./lib/parse";
export * from "./lib/types";
