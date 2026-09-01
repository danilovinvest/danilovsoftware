/**
 * Surface publique du module « fiches client ». Les autres modules et les
 * routes de l'app n'importent que d'ici, jamais d'un fichier interne.
 */
export { CustomersView } from "./components/customers-view";
export { CustomerDetailView } from "./components/customer-detail-view";
export { CustomerForm } from "./components/customer-form";
export { CustomerWizard } from "./components/customer-wizard";
export { EnumBadge } from "./components/enum-badge";
export * from "./lib/labels";
export * from "./lib/types";
