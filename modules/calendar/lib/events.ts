import {
  CALENDARS,
  EVENTS,
  ORGANIZERS,
  RECURRING,
  resolveAttendee,
  type SeedEvent,
  type SeedRecurring,
} from "./seed";
import type { GoogleEvent, Occurrence } from "./types";

/**
 * Dépliage du calendrier.
 *
 * Les séries récurrentes sont développées en occurrences avant d'atteindre les
 * composants — c'est ce que fait `singleEvents=true` côté API Google, et c'est
 * ce qui évite qu'une grille de calendrier ait à interpréter une RRULE pour
 * savoir quoi peindre. Chaque occurrence garde `recurringEventId` et la règle,
 * pour que la fiche d'événement puisse dire « tous les lundis ».
 */

const DAY = 86_400_000;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Semaine française : lundi en tête. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7;
  return addDays(day, -offset);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Les 42 jours d'une grille mensuelle : six semaines pleines commençant un
 * lundi. Toujours six, jamais cinq — une grille qui change de hauteur d'un
 * mois à l'autre fait sauter toute la page.
 */
export function monthMatrix(month: Date): Date[] {
  const first = startOfWeek(new Date(month.getFullYear(), month.getMonth(), 1));
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function at(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
}

function timed(day: Date, time: string, minutes: number) {
  const start = at(day, time);
  const end = new Date(start.getTime() + minutes * 60_000);
  return {
    start: { dateTime: start.toISOString(), timeZone: "Europe/Paris" },
    end: { dateTime: end.toISOString(), timeZone: "Europe/Paris" },
  };
}

/** Google borne les journées entières en date de fin **exclue**. */
function allDay(day: Date, days: number) {
  return {
    start: { date: dateKey(day) },
    end: { date: dateKey(addDays(day, days)) },
  };
}

function buildOneOff(seed: SeedEvent, anchorWeek: Date): GoogleEvent {
  const day = addDays(anchorWeek, seed.week * 7 + (seed.weekday - 1));
  const bounds =
    seed.days !== undefined
      ? allDay(day, seed.days)
      : timed(day, seed.start ?? "09:00", seed.minutes ?? 60);

  return {
    id: seed.id,
    status: seed.status ?? "confirmed",
    summary: seed.summary,
    description: seed.description,
    location: seed.location,
    calendarId: seed.calendarId,
    organizer: ORGANIZERS.alex,
    attendees: seed.attendees?.map(resolveAttendee),
    hangoutLink: seed.meet ? `https://meet.google.com/${seed.id}-ompt` : undefined,
    eventType: seed.eventType ?? "default",
    crmCustomer: seed.customer,
    created: new Date(day.getTime() - 21 * DAY).toISOString(),
    updated: new Date(day.getTime() - 3 * DAY).toISOString(),
    ...bounds,
  };
}

/** Occurrence d'une série : même identifiant que chez Google, `série_date`. */
function buildOccurrence(seed: SeedRecurring, day: Date): GoogleEvent {
  return {
    id: `${seed.id}_${dateKey(day).replaceAll("-", "")}`,
    status: "confirmed",
    summary: seed.summary,
    description: seed.description,
    location: seed.location,
    calendarId: seed.calendarId,
    organizer: ORGANIZERS.alex,
    attendees: seed.attendees?.map(resolveAttendee),
    hangoutLink: seed.meet ? `https://meet.google.com/${seed.id}-ompt` : undefined,
    recurringEventId: seed.id,
    recurrence: [seed.rrule],
    eventType: "default",
    created: new Date(day.getTime() - 120 * DAY).toISOString(),
    updated: new Date(day.getTime() - 120 * DAY).toISOString(),
    ...timed(day, seed.start, seed.minutes),
  };
}

/** N-ième `weekday` du mois de `month` (1 = lundi). */
function nthWeekdayOfMonth(month: Date, weekday: number, nth: number): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const shift = (weekday - ((first.getDay() + 6) % 7) - 1 + 7) % 7;
  return addDays(first, shift + (nth - 1) * 7);
}

/**
 * Tous les événements de la fenêtre utile : deux mois en arrière, trois en
 * avant. Assez pour naviguer sans jamais tomber sur un mois vide, sans
 * fabriquer une année entière que personne ne regardera.
 */
export function buildEvents(anchor: Date): GoogleEvent[] {
  const week = startOfWeek(anchor);
  const events = EVENTS.map((seed) => buildOneOff(seed, week));

  for (const series of RECURRING) {
    if (series.nth !== undefined) {
      for (let offset = -2; offset <= 3; offset += 1) {
        const month = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1);
        events.push(
          buildOccurrence(series, nthWeekdayOfMonth(month, series.weekday, series.nth)),
        );
      }
      continue;
    }
    for (let offset = -9; offset <= 13; offset += 1) {
      events.push(buildOccurrence(series, addDays(week, offset * 7 + (series.weekday - 1))));
    }
  }

  return events;
}

export function toOccurrence(event: GoogleEvent): Occurrence {
  const isAllDay = event.start.date !== undefined;
  const start = isAllDay
    ? startOfDay(new Date(`${event.start.date}T00:00:00`))
    : new Date(event.start.dateTime ?? "");
  const end = isAllDay
    ? startOfDay(new Date(`${event.end.date}T00:00:00`))
    : new Date(event.end.dateTime ?? "");

  return { key: event.id, event, start, end, allDay: isAllDay };
}

/** Une occurrence touche-t-elle ce jour ? Bornes de fin exclues, comme Google. */
export function touchesDay(occurrence: Occurrence, day: Date): boolean {
  const from = startOfDay(day).getTime();
  const to = from + DAY;
  return occurrence.start.getTime() < to && occurrence.end.getTime() > from;
}

export function occurrencesForDay(list: Occurrence[], day: Date): Occurrence[] {
  return list
    .filter((occurrence) => touchesDay(occurrence, day))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return a.start.getTime() - b.start.getTime();
    });
}

export function calendarById(id: string) {
  return CALENDARS.find((calendar) => calendar.id === id);
}
