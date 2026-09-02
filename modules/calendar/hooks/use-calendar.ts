"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import {
  addDays,
  monthMatrix,
  startOfDay,
  startOfWeek,
  toOccurrence,
} from "../lib/events";
import { formatDayShort, formatMonthYear } from "../lib/labels";
import type { Calendar, CalendarEvent, CalendarView, Occurrence } from "../lib/types";

type Resolved<T> = { key: string; data: T | null; error: string | null };

/**
 * État du calendrier.
 *
 * Les événements sont demandés **par mois calendaire élargi**, pas par fenêtre
 * visible. Une vue semaine glisse de sept jours à chaque flèche : redemander à
 * chaque geste rendrait la navigation saccadée pour rien, alors que le mois
 * autour du curseur couvre déjà toutes les vues et ne change que douze fois par
 * an. La clé de chargement est donc le mois, et non `range`.
 *
 * `today` est figé au montage. Sans cela, le liseré « aujourd'hui » se
 * recalculerait à chaque rendu sur une horloge qui a bougé.
 */
export function useCalendar() {
  const [today] = useState(() => startOfDay(new Date()));
  const [cursor, setCursor] = useState(today);
  const [view, setView] = useState<CalendarView>("mois");
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [token, setToken] = useState(0);

  // Le mois du curseur, débordé d'une semaine de chaque côté : une grille
  // mensuelle montre déjà les derniers jours du mois précédent, et la vue
  // agenda va trente jours en avant.
  const span = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    return { from: addDays(first, -14), to: addDays(first, 60) };
  }, [cursor]);

  const key = `${span.from.toISOString()}|${span.to.toISOString()}|${token}`;
  const [resolved, setResolved] = useState<
    Resolved<{ events: CalendarEvent[]; calendars: Calendar[] }>
  >({ key: "", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      api.listEvents(span.from, span.to, controller.signal),
      api.listCalendars(controller.signal),
    ])
      .then(([events, calendars]) =>
        setResolved({
          key,
          data: { events: events.items, calendars: calendars.items },
          error: null,
        }),
      )
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });

    return () => controller.abort();
  }, [key, span.from, span.to]);

  const loadedCalendars = useMemo(() => resolved.data?.calendars ?? [], [resolved.data]);

  const occurrences = useMemo(
    () => (resolved.data?.events ?? []).map(toOccurrence),
    [resolved.data],
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
    () => occurrences.filter((o) => inRange(o) && !hidden.has(o.event.calendar_id)),
    [occurrences, inRange, hidden],
  );

  const calendars = useMemo(
    () =>
      loadedCalendars.map((calendar) => ({
        ...calendar,
        hidden: hidden.has(calendar.id),
        count: occurrences.filter(
          (o) => inRange(o) && o.event.calendar_id === calendar.id,
        ).length,
      })),
    [loadedCalendars, occurrences, inRange, hidden],
  );

  // Après une écriture : l'API a déjà rangé la ressource rendue par Google
  // dans la copie locale, il suffit de la redemander.
  const reload = useCallback(() => setToken((value) => value + 1), []);

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
    /** Les agendas bruts, pour le formulaire : il lui faut `access_role`. */
    rawCalendars: loadedCalendars,
    toggleCalendar,
    reload,
    occurrences: visible,
    /** Nombre total d'occurrences chargées, agendas masqués compris. */
    loaded: occurrences.length,
    loading: resolved.key !== key,
    error: resolved.error,
    /** Y a-t-il au moins un agenda ? Sinon il n'y a rien à peindre. */
    ready: loadedCalendars.length > 0,
    goPrev: () => step(-1),
    goNext: () => step(1),
    goToday: () => setCursor(today),
    openDay: (day: Date) => {
      setCursor(day);
      setView("semaine");
    },
  };
}
