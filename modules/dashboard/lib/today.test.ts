import { describe, expect, test } from "bun:test";
import { filtersFromQuery } from "../../customers/lib/list-query";
import {
  agendaWindow,
  cycleHref,
  dayKey,
  groupAgenda,
  isPast,
  reviewHref,
  type AgendaEntry,
} from "./today";

// Mercredi 30 septembre 2026, 10 h, heure du poste.
const NOW = new Date(2026, 8, 30, 10, 0);

function at(day: number, hour: number, minute = 0): string {
  return new Date(2026, 8, day, hour, minute).toISOString();
}

function timed(name: string, startDay: number, startHour: number, endDay: number, endHour: number) {
  return { name, starts_at: at(startDay, startHour), ends_at: at(endDay, endHour), all_day: false };
}

function allDay(name: string, startDay: number, endDayExclusive: number) {
  return { name, starts_at: at(startDay, 0), ends_at: at(endDayExclusive, 0), all_day: true };
}

const names = (events: Array<AgendaEntry & { name: string }>) => events.map((e) => e.name);

describe("agendaWindow", () => {
  test("covers today and tomorrow, from local midnight", () => {
    const { from, to } = agendaWindow(NOW);
    expect(from).toEqual(new Date(2026, 8, 30));
    expect(to).toEqual(new Date(2026, 9, 2));
  });
});

describe("dayKey", () => {
  test("uses the local date, zero-padded", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("groupAgenda", () => {
  test("splits events between today and tomorrow, in time order", () => {
    const days = groupAgenda(
      [timed("demain 9h", 31, 9, 31, 10), timed("14h", 30, 14, 30, 15), timed("9h", 30, 9, 30, 10)],
      NOW,
    );
    expect(names(days.today)).toEqual(["9h", "14h"]);
    expect(names(days.tomorrow)).toEqual(["demain 9h"]);
  });

  test("puts all-day events first", () => {
    const days = groupAgenda([timed("8h", 30, 8, 30, 9), allDay("congé", 30, 31)], NOW);
    expect(names(days.today)).toEqual(["congé", "8h"]);
  });

  test("an all-day event ending at midnight does not spill into the next day", () => {
    const days = groupAgenda([allDay("hier", 29, 30), allDay("aujourd'hui", 30, 31)], NOW);
    expect(names(days.today)).toEqual(["aujourd'hui"]);
    expect(names(days.tomorrow)).toEqual([]);
  });

  test("a multi-day event in progress belongs to today only", () => {
    const days = groupAgenda([timed("chantier", 28, 8, 31, 17)], NOW);
    expect(names(days.today)).toEqual(["chantier"]);
    expect(names(days.tomorrow)).toEqual([]);
  });

  test("an event ending exactly at midnight stays out of the next day", () => {
    const days = groupAgenda([timed("soirée", 30, 20, 31, 0)], NOW);
    expect(names(days.today)).toEqual(["soirée"]);
    expect(names(days.tomorrow)).toEqual([]);
  });

  test("an event starting exactly at midnight tomorrow belongs to tomorrow", () => {
    const days = groupAgenda([timed("minuit", 31, 0, 31, 1)], NOW);
    expect(names(days.today)).toEqual([]);
    expect(names(days.tomorrow)).toEqual(["minuit"]);
  });

  test("an event spanning today and tomorrow is listed once, today", () => {
    const days = groupAgenda([timed("nuit", 30, 22, 31, 6)], NOW);
    expect(names(days.today)).toEqual(["nuit"]);
    expect(names(days.tomorrow)).toEqual([]);
  });

  test("does not reorder the list it was given", () => {
    const events = [timed("14h", 30, 14, 30, 15), timed("9h", 30, 9, 30, 10)];
    groupAgenda(events, NOW);
    expect(names(events)).toEqual(["14h", "9h"]);
  });

  test("drops events outside the two days", () => {
    const days = groupAgenda([timed("après-demain", 32, 9, 32, 10)], NOW);
    expect(days.today).toEqual([]);
    expect(days.tomorrow).toEqual([]);
  });
});

describe("isPast", () => {
  test("an event that has ended is past, one still running is not", () => {
    expect(isPast(timed("fini", 30, 8, 30, 9), NOW)).toBe(true);
    expect(isPast(timed("en cours", 30, 9, 30, 11), NOW)).toBe(false);
  });

  test("an event ending at this very instant is past", () => {
    expect(isPast(timed("pile", 30, 9, 30, 10), NOW)).toBe(true);
  });
});

describe("counter links", () => {
  const DEFAULTS = { sort: "name", status: ["client"], page: 1, per_page: 25 } as const;
  const parse = (href: string) =>
    filtersFromQuery(new URLSearchParams(href.split("?")[1]), {
      ...DEFAULTS,
      status: [...DEFAULTS.status],
    });

  test("a cycle link opens the list on that filter, across every status", () => {
    const filters = parse(cycleHref("a_relancer"));
    expect(filters.cycle).toBe("a_relancer");
    expect(filters.status).toBeUndefined();
  });

  test("a review link opens the list on that filter, across every status", () => {
    const filters = parse(reviewHref("a_verifier"));
    expect(filters.review).toBe("a_verifier");
    expect(filters.status).toBeUndefined();
  });
});
