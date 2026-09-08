/**
 * Surface publique du module « calendrier ». Les routes de l'app et les autres
 * modules n'importent que d'ici.
 */
export { CalendarView } from "./components/calendar-view";
// Le raccordement Google s'affiche dans l'écran des réglages, mais tout ce qui
// le compose appartient au calendrier : le bouton de marque, l'état de la copie
// et son journal.
export { GoogleButton } from "./components/google-button";
export { GoogleMark } from "./components/google-mark";
export { SyncBadge } from "./components/sync-badge";
export {
  CALENDAR_PALETTE,
  EVENT_KIND,
  EVENT_KIND_OPTIONS,
  EVENT_KIND_TONE,
  formatRange,
  formatDayShort,
} from "./lib/labels";
export { SyncLogDialog } from "./components/sync-log-dialog";
export { ImportLogDialog } from "./components/import-log";
export { useSyncRuns } from "./hooks/use-sync-runs";
export * from "./lib/types";
// Le raccordement du compte Google se pilote depuis l'écran des réglages, qui
// n'a pas à connaître les chemins d'API du calendrier.
export {
  authorizeUrl,
  createCalendar,
  createEvent,
  deleteCalendar,
  listCustomerEvents,
  listCalendars,
  updateCalendar,
  disconnectAccount,
  importFromGoogle,
  listAccounts,
  listImportRuns,
  listMirror,
  setMirrorSelected,
  syncNow,
} from "./lib/api";
