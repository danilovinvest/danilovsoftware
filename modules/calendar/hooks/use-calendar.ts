"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import { useAgendaPrefs, writeAgendaPrefs } from "../lib/agenda-prefs";
import {
  addDays,
  monthMatrix,
  startOfDay,
  startOfWeek,
  toOccurrence,
} from "../lib/events";
import { EVENT_KIND, VIEWS, formatDayShort, formatMonthYear } from "../lib/labels";
import { useIsNarrow, useNow } from "./use-now";
import type {
  Calendar,
  CalendarEvent,
  CalendarView,
  EventKind,
  Occurrence,
} from "../lib/types";

type Resolved<T> = { key: string; data: T | null; error: string | null };

/**
 * Délai en deçà duquel revenir sur l'onglet ne relit pas l'agenda : basculer
 * d'une fenêtre à l'autre pour copier une adresse ne justifie pas une requête.
 */
const REFRESH_GRACE_MS = 30_000;

function isView(value: unknown): value is CalendarView {
  return VIEWS.some((entry) => entry.value === value);
}

/**
 * État du calendrier.
 *
 * Les événements sont demandés **par mois calendaire élargi**, pas par fenêtre
 * visible. Une vue semaine glisse de sept jours à chaque flèche : redemander à
 * chaque geste rendrait la navigation saccadée pour rien, alors que le mois
 * autour du curseur couvre déjà toutes les vues et ne change que douze fois par
 * an. La clé de chargement est donc le mois, et non `range`.
 *
 * `now` avance à la minute et `today` change à minuit : un onglet ouvert la
 * veille montrait sinon le mauvais jour. `today` ne change d'identité qu'avec
 * la date, pour que le liseré et la période chargée ne se recalculent pas à
 * chaque minute.
 *
 * Le curseur **suit aujourd'hui** tant qu'on n'a pas navigué (`pinned` nul) :
 * passé minuit, la vue avance d'elle-même. Dès qu'on a choisi une autre
 * période, il ne bouge plus — sauter vers aujourd'hui sous les yeux de
 * quelqu'un qui prépare la semaine prochaine lui ferait perdre le fil.
 */
export function useCalendar(me: string | null = null) {
  const now = useNow();
  const todayStamp = startOfDay(now).getTime();
  const today = useMemo(() => new Date(todayStamp), [todayStamp]);
  const [pinned, setPinned] = useState<Date | null>(null);
  const cursor = pinned ?? today;
  // Vue, agendas et catégories masqués, « mes rendez-vous » : retenus sur ce
  // poste d'une visite à l'autre (voir `lib/agenda-prefs.ts`).
  const prefs = useAgendaPrefs();
  /*
   * La vue enregistrée l'emporte ; sans choix, le défaut suit la largeur.
   * Sur un téléphone, la grille du mois tasse sept colonnes dans 390 pixels
   * et n'y laisse lire aucun titre : la file « agenda » s'y lit.
   */
  const narrow = useIsNarrow();
  const view: CalendarView = isView(prefs.view) ? prefs.view : narrow ? "agenda" : "mois";
  const setView = useCallback((next: CalendarView) => writeAgendaPrefs({ view: next }), []);
  const hidden = useMemo(() => new Set(prefs.hiddenCalendars), [prefs.hiddenCalendars]);
  const mine = prefs.mine && me !== null;
  /**
   * Les catégories masquées, sur le modèle des agendas.
   *
   * Deux jeux distincts et non un seul : masquer « Échange » ne doit pas
   * dépendre de l'agenda où l'échange a été posé, et réciproquement. Les
   * confondre obligerait à cocher dix cases pour ne voir qu'une chose.
   */
  const hiddenKinds = useMemo(() => new Set(prefs.hiddenKinds), [prefs.hiddenKinds]);
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
  // Quand la dernière lecture est partie, et si celle en cours est une relecture
  // de fond — au retour sur l'onglet — dont l'échec ne doit rien effacer.
  const startedAt = useRef(0);
  const silentToken = useRef(-1);

  useEffect(() => {
    const controller = new AbortController();
    startedAt.current = Date.now();
    const background = silentToken.current === token;

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
        // Un téléphone qui sort de veille n'a pas toujours déjà du réseau :
        // la relecture de fond qui échoue garde l'agenda affiché plutôt que de
        // le remplacer par « Agenda indisponible ».
        setResolved((current) =>
          background && current.data
            ? { ...current, key }
            : { key, data: null, error: errorMessage(cause) },
        );
      });

    return () => controller.abort();
  }, [key, token, span.from, span.to]);

  /*
   * Revenir sur l'onglet relit les événements.
   *
   * Les rendez-vous posés par les collègues n'arrivaient qu'au rechargement de
   * la page. La période affichée ne bouge pas — seul le jeton change — et une
   * lecture partie il y a moins de trente secondes suffit : pas de double
   * chargement quand on bascule d'une fenêtre à l'autre.
   */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - startedAt.current < REFRESH_GRACE_MS) return;
      setToken((value) => {
        silentToken.current = value + 1;
        return value + 1;
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

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
    () =>
      occurrences.filter(
        (o) =>
          inRange(o) &&
          !hidden.has(o.event.calendar_id) &&
          !hiddenKinds.has(o.event.kind) &&
          // « Mes rendez-vous » : posés pour moi, ou par moi sans destinataire.
          (!mine ||
            o.event.assignee_id === me ||
            (o.event.assignee_id === null && o.event.created_by === me)),
      ),
    [occurrences, inRange, hidden, hiddenKinds, mine, me],
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

  /**
   * Les cinq catégories et ce qu'elles pèsent sur la période affichée.
   *
   * Une catégorie sans aucun événement reste dans la liste : la faire
   * disparaître ferait chercher où sont passés les échanges le mois où il n'y
   * en a pas eu — ce qui est précisément la réponse.
   */
  const kinds = useMemo(
    () =>
      (Object.keys(EVENT_KIND) as EventKind[]).map((kind) => ({
        kind,
        label: EVENT_KIND[kind].label,
        hidden: hiddenKinds.has(kind),
        count: occurrences.filter((o) => inRange(o) && o.event.kind === kind).length,
      })),
    [occurrences, inRange, hiddenKinds],
  );

  const reload = useCallback(() => setToken((value) => value + 1), []);

  /*
   * Remplace un événement dans la fenêtre déjà chargée.
   *
   * Un glissement rend l'événement mis à jour ; le redemander au serveur ferait
   * revenir le bloc à sa place ancienne le temps de l'aller-retour, ce qui se
   * voit et se lit comme un échec. On range la réponse à la place de l'ancienne
   * ligne, et l'écran ne cille pas.
   */
  const replace = useCallback((updated: CalendarEvent) => {
    setResolved((current) => {
      if (!current.data) return current;
      return {
        ...current,
        data: {
          ...current.data,
          events: current.data.events.map((event) =>
            event.id === updated.id ? updated : event,
          ),
        },
      };
    });
  }, []);

  const toggleCalendar = useCallback((id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    writeAgendaPrefs({ hiddenCalendars: [...next] });
  }, [hidden]);

  const toggleKind = useCallback((kind: EventKind) => {
    const next = new Set(hiddenKinds);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    writeAgendaPrefs({ hiddenKinds: [...next] });
  }, [hiddenKinds]);

  const toggleMine = useCallback(() => writeAgendaPrefs({ mine: !prefs.mine }), [prefs.mine]);

  const step = useCallback(
    (direction: number) => {
      setPinned((pin) => {
        const current = pin ?? today;
        if (view === "mois") {
          return new Date(current.getFullYear(), current.getMonth() + direction, 1);
        }
        return addDays(current, direction * (view === "semaine" ? 7 : 30));
      });
    },
    [view, today],
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
    /** L'instant courant, à la minute : la ligne de l'heure de la semaine. */
    now,
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
    kinds,
    toggleKind,
    /** Seulement mes rendez-vous : posés pour moi, ou par moi. */
    mine,
    toggleMine,
    reload,
    replace,
    occurrences: visible,
    /** Nombre total d'occurrences chargées, agendas masqués compris. */
    loaded: occurrences.length,
    loading: resolved.key !== key,
    error: resolved.error,
    /** Y a-t-il au moins un agenda ? Sinon il n'y a rien à peindre. */
    ready: loadedCalendars.length > 0,
    goPrev: () => step(-1),
    goNext: () => step(1),
    // Revenir à aujourd'hui, c'est aussi recommencer à le suivre.
    goToday: () => setPinned(null),
    openDay: (day: Date) => {
      setPinned(day);
      setView("semaine");
    },
  };
}
