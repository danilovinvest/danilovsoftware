/**
 * Types du module calendrier.
 *
 * Le CRM tient désormais ses propres événements ; ces types sont les siens et
 * non plus ceux de l'API Google. Ce qui vient d'un import garde `imported` à
 * vrai, avec son organisateur et ses invités recopiés — affichés, jamais
 * modifiables : ils appartiennent à l'agenda d'origine, et prétendre les éditer
 * sans pouvoir envoyer d'invitation serait mentir.
 */

export type ResponseStatus = "accepted" | "declined" | "tentative" | "needsAction";

/** Un invité, tel que l'import l'a recopié depuis Google. */
export type Attendee = {
  email?: string;
  displayName?: string;
  responseStatus: ResponseStatus;
  organizer?: boolean;
  optional?: boolean;
  self?: boolean;
};

export type CalendarEvent = {
  id: string;
  calendar_id: string;
  calendar_name: string;
  /** Rang dans la palette du thème, jamais une couleur littérale. */
  color: number;
  title: string;
  description: string;
  location: string;
  /** Instants ISO 8601. Une journée entière est bornée à minuit local, et sa
   * fin est **exclusive** : un événement d'un seul jour porte le lendemain. */
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  imported: boolean;
  organizer: string;
  attendees: Attendee[];
  meet_url: string;
  updated_at: string;
};

export type Calendar = {
  id: string;
  name: string;
  color: number;
  visible: boolean;
  event_count: number;
  /** Renseigné quand l'agenda vient d'un import Google. */
  google_calendar_id: string;
};

export type EventInput = {
  calendar_id: string;
  title: string;
  description: string;
  location: string;
  all_day: boolean;
  /** ISO 8601 pour un horaire, AAAA-MM-JJ pour une journée entière. */
  start: string;
  end: string;
};

/**
 * Une occurrence prête à peindre : les bornes résolues en `Date`, et le
 * découpage jour-entier / horaire déjà tranché. Les composants ne manipulent
 * jamais les chaînes ISO directement.
 */
export type Occurrence = {
  key: string;
  event: CalendarEvent;
  start: Date;
  end: Date;
  allDay: boolean;
  calendarName: string;
  style: CalendarStyle;
};

/** Les classes d'un agenda. Résolues une fois, portées par l'occurrence. */
export type CalendarStyle = {
  dot: string;
  soft: string;
  text: string;
  solid: string;
  rail: string;
};

export type CalendarView = "mois" | "semaine" | "agenda";

/* --- Le miroir Google, réduit à ce qu'il sert : importer -------------------- */

export type GoogleAccount = {
  id: string;
  email: string;
  scope: string;
  connected_at: string;
  last_sync_at: string | null;
  /** Vide quand tout va bien ; sinon la raison, telle que Google l'a dite. */
  last_error: string;
};

/** Un agenda du compte Google, tel que la copie le connaît. */
export type MirrorCalendar = {
  id: string;
  account_id: string;
  summary: string;
  description: string;
  time_zone: string;
  access_role: string;
  primary: boolean;
  /** Recopié dans le miroir, donc importable. */
  selected: boolean;
  event_count: number;
  synced_at: string | null;
};

export type ImportReport = {
  calendars: number;
  added: number;
  /** Déjà connus, donc laissés tels quels — corrections locales comprises. */
  skipped: number;
};

/**
 * Une exécution de la copie du miroir Google.
 *
 * `finished_at` nul veut dire « en cours », et c'est la seule chose qui fasse
 * dire au badge qu'une copie tourne. Le déduire d'une horloge mentirait dès
 * qu'une exécution dure plus longtemps que prévu.
 */
export type SyncRun = {
  id: number;
  email: string;
  started_at: string;
  finished_at: string | null;
  /** « automatique », « manuelle » ou « raccordement ». */
  origin: string;
  calendars: number;
  created: number;
  updated: number;
  deleted: number;
  error: string;
  details: SyncDetail[];
};

export type SyncDetail = {
  calendar: string;
  summary: string;
  /** « complète » ou « incrémentale ». */
  mode: string;
  created: number;
  updated: number;
  deleted: number;
  error?: string;
};
