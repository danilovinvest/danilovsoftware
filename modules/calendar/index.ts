/**
 * Surface publique du module « calendrier ». Les routes de l'app et les autres
 * modules n'importent que d'ici.
 */
export { CalendarView } from "./components/calendar-view";
export * from "./lib/types";
// Le raccordement du compte Google se pilote depuis l'écran des réglages, qui
// n'a pas à connaître les chemins d'API du calendrier.
export {
  authorizeUrl,
  disconnectAccount,
  listAccounts,
  listCalendars,
  setCalendarSelected,
  syncNow,
} from "./lib/api";
