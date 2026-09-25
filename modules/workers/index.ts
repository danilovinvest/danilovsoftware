/**
 * Les ouvriers : l'équipe de chantier et son pointage.
 *
 * Surface publique du module. Les autres modules n'importent que d'ici.
 */
export { WorkersView } from "./components/workers-view";
export { PointageScreen } from "./components/pointage-screen";
export type { Worker, WorkerMonth, WorkerStatus, PortalState } from "./lib/types";
export { STATUS_LABEL } from "./lib/labels";
