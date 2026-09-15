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
// La mission, le numéro de dossier et les délais : lus aussi par l'écran Études.
export * from "./lib/mission";
export {
  EMPTY_JALONS,
  EMPTY_MARKS,
  JALON_ORDER,
  readJalons,
  readMarks,
  type Jalons,
  type StepMarks,
} from "./lib/jalons";
export { ProjectCycle } from "./components/project-cycle";
// « Mes dossiers » : l'autre moitié de l'assignation. Une affaire qui porte un
// responsable a besoin d'un endroit où celui-ci la retrouve.
export { MyProjectsView } from "./components/my-projects-view";
// L'écran des doublons vit dans les réglages, mais tout ce qu'il manipule — la
// ressemblance de deux fiches, la fusion — appartient aux fiches.
export { DuplicatesPanel } from "./components/duplicates-panel";
// Le choix d'une fiche par la recherche : l'agenda en a besoin pour rattacher
// un rendez-vous à son client, et trois cent soixante-six fiches n'entrent pas
// dans une liste déroulante.
export { CustomerPicker } from "./components/customer-picker";
export { ProjectPicker } from "./components/project-picker";
// Le panneau des jalons d'après-signature sert aussi à la fiche latérale des
// chantiers et des études : c'est la même liste de cases, sur la même affaire.
export { ProjectJalons } from "./components/project-jalons";
export { setMilestones, setQuoteDeposit, updateProject } from "./lib/api";
export { DepositTag, depositTotalOf } from "./components/deposit-field";
// Les tâches ont besoin des affaires d'une fiche pour proposer à laquelle se
// rattacher. Une route dédiée ne se justifierait pas : la fiche est déjà
// servie en un appel, et c'est un geste explicite de l'utilisateur.
export { getCustomer } from "./lib/api";
export * from "./lib/types";
export { ImportView } from "./import";
