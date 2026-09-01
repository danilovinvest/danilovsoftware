/**
 * Types du module calendrier.
 *
 * Ils reprennent la forme de la ressource `events` de l'API Google Calendar
 * — `start`/`end` en objets qui portent soit `date` (journée entière) soit
 * `dateTime`, `attendees` avec leur `responseStatus`, `recurringEventId` sur
 * les occurrences d'une série. Ce n'est pas une coquetterie : le jour où le
 * CRM branchera un vrai compte Google, la réponse de l'API se déversera ici
 * sans transformation, et seul le chargement changera.
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

/** Entrée de `calendarList` : un agenda auquel le compte est abonné. */
export type CalendarListEntry = {
  id: string;
  summary: string;
  description: string;
  /** Clé de couleur résolue en classes par `lib/labels.ts`. */
  colorKey: ColorKey;
  primary?: boolean;
  accessRole: "owner" | "writer" | "reader";
  timeZone: string;
};

export type ColorKey = "chantier" | "etude" | "interne" | "client" | "absence";

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
};

export type CalendarView = "mois" | "semaine" | "agenda";
