/**
 * Types du module calendrier.
 *
 * Ils reprennent la forme de la ressource `events` de l'API Google Calendar
 * — `start`/`end` en objets qui portent soit `date` (journée entière) soit
 * `dateTime`, `attendees` avec leur `responseStatus`, `recurringEventId` sur
 * les occurrences d'une série. Le pari est tenu : l'API du CRM recopie l'agenda
 * Google et rend ces ressources **intactes**, augmentées du seul `calendarId`,
 * que Google laisse dans l'URL demandée plutôt que dans l'événement.
 *
 * Une seule entorse assumée : `email` est facultatif sur un invité. Un agenda
 * partagé en lecture masque les adresses des participants externes, et il vaut
 * mieux un nom seul qu'une adresse fabriquée.
 */

/** Une date de calendrier : jour entier (`date`) ou instant précis (`dateTime`). */
export type EventDateTime = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

export type ResponseStatus = "accepted" | "declined" | "tentative" | "needsAction";

export type Attendee = {
  email?: string;
  displayName: string;
  responseStatus: ResponseStatus;
  organizer?: boolean;
  optional?: boolean;
};

export type GoogleEvent = {
  id: string;
  status: "confirmed" | "tentative" | "cancelled";
  summary: string;
  description?: string;
  location?: string;
  start: EventDateTime;
  end: EventDateTime;
  /** Agenda d'origine — la couleur en découle. */
  calendarId: string;
  organizer: { email?: string; displayName: string };
  attendees?: Attendee[];
  hangoutLink?: string;
  /** Renseigné sur chaque occurrence d'une série. */
  recurringEventId?: string;
  /** RRULE de la série, portée par l'occurrence pour l'afficher telle quelle. */
  recurrence?: string[];
  eventType?: "default" | "outOfOffice" | "focusTime";
  /** Fiche client concernée, quand l'événement en vise une. */
  crmCustomer?: string;
  created: string;
  updated: string;
};

/** Entrée de `calendarList` : un agenda auquel le compte Google est abonné. */
export type CalendarListEntry = {
  id: string;
  account_id: string;
  summary: string;
  description: string;
  time_zone: string;
  access_role: string;
  /** Couleur choisie dans Google. Reçue, mais pas peinte — voir `labels.ts`. */
  background_color: string;
  primary: boolean;
  /** Agenda recopié ou non. Choix local, sans effet sur le compte Google. */
  selected: boolean;
  event_count: number;
  synced_at: string | null;
};

/** Le compte Google raccordé, et l'état de sa dernière synchronisation. */
export type GoogleAccount = {
  id: string;
  email: string;
  scope: string;
  connected_at: string;
  last_sync_at: string | null;
  /** Vide quand tout va bien ; sinon la raison, telle que Google l'a dite. */
  last_error: string;
};

/**
 * Une occurrence prête à peindre : les bornes résolues en `Date`, et le
 * découpage jour-entier / horaire déjà tranché. Les composants ne manipulent
 * jamais `EventDateTime` directement.
 */
export type Occurrence = {
  key: string;
  event: GoogleEvent;
  start: Date;
  end: Date;
  allDay: boolean;
  /** Nom de l'agenda d'origine, et le jeu de classes qui l'habille. */
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
