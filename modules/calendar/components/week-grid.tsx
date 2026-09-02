"use client";

import { cn } from "@/lib/utils";
import { addDays, isSameDay, startOfDay, startOfWeek } from "../lib/events";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  WEEKDAYS,
  formatRange,
} from "../lib/labels";
import type { Occurrence } from "../lib/types";

/**
 * La vue semaine, avec une bande de journées entières au-dessus de la grille
 * horaire — la séparation que fait Google, et pour la même raison : un congé de
 * trois jours n'a pas de place dans une colonne d'heures.
 *
 * Les chevauchements sont résolus en couloirs : les événements qui se
 * recouvrent forment un groupe, et se partagent la largeur de la colonne. Sans
 * cela, deux rendez-vous à la même heure se peindraient l'un sur l'autre et le
 * second serait invisible.
 */

const HOUR_HEIGHT = 52;
const MIN_BLOCK = 22;
const DAY = 86_400_000;

type Placed = { occurrence: Occurrence; column: number; columns: number };

function layoutDay(list: Occurrence[]): Placed[] {
  const sorted = [...list].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime(),
  );

  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let lanes: number[] = [];
  let clusterEnd = 0;

  const flush = () => {
    const columns = cluster.reduce((max, item) => Math.max(max, item.column + 1), 1);
    for (const item of cluster) placed.push({ ...item, columns });
    cluster = [];
    lanes = [];
  };

  for (const occurrence of sorted) {
    if (cluster.length > 0 && occurrence.start.getTime() >= clusterEnd) flush();

    let column = lanes.findIndex((end) => end <= occurrence.start.getTime());
    if (column === -1) column = lanes.length;
    lanes[column] = occurrence.end.getTime();

    cluster.push({ occurrence, column, columns: 1 });
    clusterEnd = Math.max(clusterEnd, occurrence.end.getTime());
  }
  if (cluster.length > 0) flush();

  return placed;
}

/** Position verticale d'un instant, clipée sur la plage horaire affichée. */
function offsetOf(date: Date, day: Date): number {
  const minutes = (date.getTime() - startOfDay(day).getTime()) / 60_000;
  return ((minutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT;
}

export function WeekGrid({
  cursor,
  today,
  now,
  occurrences,
  onSelect,
}: {
  cursor: Date;
  today: Date;
  now: Date;
  occurrences: Occurrence[];
  onSelect: (occurrence: Occurrence) => void;
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, index) => DAY_START_HOUR + index,
  );

  const allDay = occurrences.filter((o) => o.allDay);
  const hasToday = days.some((day) => isSameDay(day, today));

  return (
    <div className="flex min-h-[34rem] flex-1 flex-col">
      {/* En-tête : jour, date, et la bande des journées entières. */}
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b">
        <div className="border-r" />
        {days.map((day, index) => (
          <div
            key={day.toISOString()}
            className={cn("border-r px-1 py-1.5 text-center last:border-r-0")}
          >
            <p className="text-muted-foreground text-[11px]">{WEEKDAYS[index]}</p>
            <p
              className={cn(
                "mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-sm tabular-nums",
                isSameDay(day, today) && "bg-brand font-medium text-white",
              )}
            >
              {day.getDate()}
            </p>
          </div>
        ))}
      </div>

      {allDay.length > 0 && (
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b">
          <div className="text-muted-foreground border-r px-1 py-1 text-right text-[10px]">
            journée
          </div>
          {days.map((day) => {
            const from = startOfDay(day).getTime();
            const items = allDay.filter(
              (o) => o.start.getTime() < from + DAY && o.end.getTime() > from,
            );
            return (
              <div
                key={day.toISOString()}
                className="flex flex-col gap-0.5 border-r p-1 last:border-r-0"
              >
                {items.map((occurrence) => {
                  const style = occurrence.style;
                  return (
                    <button
                      key={occurrence.key}
                      type="button"
                      onClick={() => onSelect(occurrence)}
                      className={cn(
                        "truncate rounded-[3px] px-1.5 py-0.5 text-left text-[11px] font-medium",
                        style.solid,
                      )}
                    >
                      {occurrence.event.summary}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          {/* Colonne des heures. */}
          <div className="border-r">
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="text-muted-foreground relative pr-1 text-right text-[10px] tabular-nums"
              >
                <span className="absolute -top-1.5 right-1">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const from = startOfDay(day).getTime();
            const timed = occurrences.filter(
              (o) => !o.allDay && o.start.getTime() >= from && o.start.getTime() < from + DAY,
            );
            const placed = layoutDay(timed);

            return (
              <div key={day.toISOString()} className="relative border-r last:border-r-0">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: HOUR_HEIGHT }}
                    className="border-b last:border-b-0"
                  />
                ))}

                {hasToday && isSameDay(day, today) && (
                  <div
                    className="bg-danger pointer-events-none absolute inset-x-0 z-10 h-px"
                    style={{ top: offsetOf(now, day) }}
                  >
                    <span className="bg-danger absolute -top-1 -left-1 size-2 rounded-full" />
                  </div>
                )}

                {placed.map(({ occurrence, column, columns }) => {
                  const style = occurrence.style;
                  const top = offsetOf(occurrence.start, day);
                  const height = Math.max(
                    MIN_BLOCK,
                    offsetOf(occurrence.end, day) - top,
                  );
                  const width = 100 / columns;

                  return (
                    <button
                      key={occurrence.key}
                      type="button"
                      onClick={() => onSelect(occurrence)}
                      style={{
                        top,
                        height,
                        left: `calc(${column * width}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                      }}
                      className={cn(
                        "absolute overflow-hidden rounded-[3px] border-l-2 px-1.5 py-0.5 text-left",
                        style.soft,
                        style.rail,
                        occurrence.event.status === "tentative" && "border border-dashed",
                      )}
                      title={occurrence.event.summary}
                    >
                      <span className="block truncate text-[11px] font-medium">
                        {occurrence.event.summary}
                      </span>
                      {height > 34 && (
                        <span className="text-muted-foreground block truncate text-[10px]">
                          {formatRange(occurrence.start, occurrence.end, false)}
                        </span>
                      )}
                      {height > 60 && occurrence.event.location && (
                        <span className="text-muted-foreground block truncate text-[10px]">
                          {occurrence.event.location}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
