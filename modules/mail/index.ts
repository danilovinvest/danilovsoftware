/**
 * Surface publique du module « messagerie ». Les routes de l'app et les autres
 * modules n'importent que d'ici.
 */
export { MailPanel } from "./components/mail-panel";
export { CustomerMail } from "./components/customer-mail";
export { useMailbox } from "./hooks/use-mail";
export * from "./lib/types";
