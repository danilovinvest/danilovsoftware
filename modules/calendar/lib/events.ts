import { paletteAt } from "./labels";
import type { CalendarListEntry, GoogleEvent, Occurrence } from "./types";

/**
 * Résolution des occurrences.
 *
 * Les séries récurrentes arrivent déjà dépliées : c'est `singleEvents=true`
 * côté Google, demandé par la synchronisation de l'API. Une grille de
 * calendrier n'a donc jamais à interpréter une RRULE pour savoir quoi peindre.
 * Chaque occurrence garde `recurringEventId`, et la fiche d'événement peut dire
 * « tous les lundis ».
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

/**
 * Une occurrence prête à peindre.
 *
 * Le style et le nom de l'agenda sont attachés ici, une fois, plutôt que
 * recherchés dans chaque composant : c'est l'occurrence qu'on peint, elle doit
 * porter de quoi l'être. Les quatre vues cessent ainsi de dépendre de la liste
 * des agendas.
 */
export function toOccurrence(
  event: GoogleEvent,
  calendars: readonly CalendarListEntry[],
): Occurrence {
  const isAllDay = event.start.date !== undefined;
  const start = isAllDay
    ? startOfDay(new Date(`${event.start.date}T00:00:00`))
    : new Date(event.start.dateTime ?? "");
  const end = isAllDay
    ? startOfDay(new Date(`${event.end.date}T00:00:00`))
    : new Date(event.end.dateTime ?? "");

  const index = calendars.findIndex((calendar) => calendar.id === event.calendarId);

  return {
    key: `${event.calendarId}:${event.id}`,
    event,
    start,
    end,
    allDay: isAllDay,
    calendarName: index >= 0 ? calendars[index].summary : event.calendarId,
    style: paletteAt(index >= 0 ? index : 0),
  };
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
