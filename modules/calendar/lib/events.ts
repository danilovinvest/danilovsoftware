import { paletteAt } from "./labels";
import type { CalendarEvent, Occurrence } from "./types";

/**
 * Résolution des occurrences.
 *
 * Un événement du CRM est une occurrence et une seule : les séries importées de
 * Google l'ont été déjà dépliées (`singleEvents=true`), chacune devenant une
 * ligne à part. Aucune grille n'a donc de RRULE à interpréter — et chaque
 * occurrence se déplace ou s'annule indépendamment des autres.
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
export function toOccurrence(event: CalendarEvent): Occurrence {
  return {
    key: event.id,
    event,
    start: new Date(event.starts_at),
    end: new Date(event.ends_at),
    allDay: event.all_day,
    calendarName: event.calendar_name,
    style: paletteAt(event.color),
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
