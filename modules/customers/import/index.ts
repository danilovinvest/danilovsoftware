/**
 * Sous-module « synchronisation Excel ». Il ne produit que des fiches clients,
 * leurs affaires et leurs devis : il vit donc sous le module customers plutôt
 * qu'à côté.
 */
export { ImportView } from "./components/import-view";
export type { Plan, PlannedCustomer, ImportReport } from "./lib/types";
