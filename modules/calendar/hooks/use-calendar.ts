"use client";

import { useCallback, useMemo, useState } from "react";
import {
  addDays,
  buildEvents,
  monthMatrix,
  startOfDay,
  startOfWeek,
  toOccurrence,
} from "../lib/events";
import { formatDayShort, formatMonthYear } from "../lib/labels";
import { CALENDARS } from "../lib/seed";
import type { CalendarView, Occurrence } from "../lib/types";

/**
 * État du calendrier.
 *
 * Il a la forme d'un hook de synchronisation — agendas, occurrences, fenêtre
 * visible — alors qu'aucun appel réseau n'a lieu : le jour où le CRM branchera
 * un compte Google, `buildEvents` cédera la place à un `events.list` et rien
 * d'autre ne bougera.
 *
 * `today` est figé au montage. Sans cela, le liseré « aujourd'hui » se
 * recalculerait à chaque rendu sur une horloge qui a bougé.
 */
export function useCalendar() {
  const [today] = useState(() => startOfDay(new Date()));
  const [cursor, setCursor] = useState(today);
  const [view, setView] = useState<CalendarView>("mois");
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set<string>());

  const occurrences = useMemo(
    () => buildEvents(today).map(toOccurrence),
    [today],
  );

  // Fenêtre réellement peinte : elle sert au filtrage comme aux compteurs de la
  // colonne des agendas, qui comptent ce qu'on voit et non tout le jeu.
  const range = useMemo(() => {
    if (view === "mois") {
      const days = monthMatrix(cursor);
      return { from: days[0], to: addDays(days[41], 1) };
    }
    if (view === "semaine") {
      const from = startOfWeek(cursor);
      return { from, to: addDays(from, 7) };
    }
    const from = startOfDay(cursor);
    return { from, to: addDays(from, 30) };
  }, [view, cursor]);

  const inRange = useCallback(
    (occurrence: Occurrence) =>
      occurrence.start.getTime() < range.to.getTime() &&
      occurrence.end.getTime() > range.from.getTime(),
    [range],
  );

  const visible = useMemo(
    () => occurrences.filter((o) => inRange(o) && !hidden.has(o.event.calendarId)),
    [occurrences, inRange, hidden],
  );

  const calendars = useMemo(
    () =>
      CALENDARS.map((calendar) => ({
        ...calendar,
        hidden: hidden.has(calendar.id),
        count: occurrences.filter(
          (o) => inRange(o) && o.event.calendarId === calendar.id,
        ).length,
      })),
    [occurrences, inRange, hidden],
  );

  const toggleCalendar = useCallback((id: string) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const step = useCallback(
    (direction: number) => {
      setCursor((current) => {
        if (view === "mois") {
          return new Date(current.getFullYear(), current.getMonth() + direction, 1);
        }
        return addDays(current, direction * (view === "semaine" ? 7 : 30));
      });
    },
    [view],
  );

  const label = useMemo(() => {
    if (view === "mois") return formatMonthYear(cursor);
    if (view === "semaine") {
      const from = startOfWeek(cursor);
      return `${formatDayShort(from)} – ${formatDayShort(addDays(from, 6))} ${from.getFullYear()}`;
    }
    return `30 jours à partir du ${formatDayShort(cursor)}`;
  }, [view, cursor]);

  return {
    today,
    cursor,
    view,
    setView,
    label,
    range,
    calendars,
    toggleCalendar,
    occurrences: visible,
    /** Nombre total d'occurrences chargées, agendas masqués compris. */
    loaded: occurrences.length,
    goPrev: () => step(-1),
    goNext: () => step(1),
    goToday: () => setCursor(today),
    openDay: (day: Date) => {
      setCursor(day);
      setView("semaine");
    },
  };
}
