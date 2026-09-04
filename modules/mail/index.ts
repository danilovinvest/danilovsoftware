/**
 * Surface publique du module « messagerie ». Les routes de l'app et les autres
 * modules n'importent que d'ici.
 */
export { MailPanel } from "./components/mail-panel";
export { CustomerMail } from "./components/customer-mail";
// La boîte entière, et non plus seulement le courrier d'une fiche : sur
// vingt-sept fiches portant une adresse, une seule a écrit dans cette boîte.
export { MailboxView } from "./components/mailbox-view";
export { useMailbox } from "./hooks/use-mail";
export * from "./lib/types";
