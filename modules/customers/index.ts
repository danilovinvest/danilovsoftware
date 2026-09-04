/**
 * Surface publique du module « fiches client ». Les autres modules et les
 * routes de l'app n'importent que d'ici, jamais d'un fichier interne.
 */
export { CustomersView } from "./components/customers-view";
export { CustomerDetailView } from "./components/customer-detail-view";
export { CustomerForm } from "./components/customer-form";
export { CustomerWizard } from "./components/customer-wizard";
export { EnumBadge } from "./components/enum-badge";
// Exposé pour la recherche globale du shell (⌘K), qui interroge les fiches
// sans pour autant dépendre des composants du module.
export { listCustomers } from "./lib/api";
export * from "./lib/labels";
// Le cycle d'une affaire est une notion transverse : le tableau de bord et les
// chantiers la lisent aussi. Elle vit ici parce que c'est l'affaire qui la
// porte, et une seule définition évite que « à relancer » ne veuille pas dire
// la même chose d'un écran à l'autre.
export * from "./lib/cycle";
export { EMPTY_JALONS, JALON_ORDER, readJalons, type Jalons } from "./lib/jalons";
export { ProjectCycle } from "./components/project-cycle";
export * from "./lib/types";
export { ImportView } from "./import";
