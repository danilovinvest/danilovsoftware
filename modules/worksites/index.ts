/**
 * Surface publique du module « chantiers ». Les routes de l'app n'importent
 * que d'ici.
 */
export { WorksitesView } from "./components/worksites-view";
// Le module marketing part des chantiers livrés : il les lit d'ici, jamais du
// jeu de données interne.
export { finishedWorksites } from "./lib/snapshot";
export * from "./lib/types";
