"use client";

import { cn } from "@/lib/utils";
import { addDays, isSameDay, startOfDay, startOfWeek } from "../lib/events";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  WEEKDAYS,
  eventTitle,
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

// Une heure vaut 44 pixels : à 52, la journée de travail ne tenait pas dans la
// carte et il fallait faire défiler pour voir un rendez-vous de 17 h. À moins,
// un créneau de trente minutes n'accueille plus son titre.
const HOUR_HEIGHT = 44;
const MIN_BLOCK = 18;
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

/*
Position verticale d'un instant, **en pourcentage** de la plage affichée.

En pixels, la grille faisait sa hauteur et laissait le bas de la carte vide :
treize heures à quarante-quatre pixels ne remplissent pas un grand écran. En
pourcentage, les rangées d'heures s'étirent pour occuper la place disponible et
les blocs suivent, sans que rien n'ait à mesurer quoi que ce soit au montage.
HOUR_HEIGHT reste le plancher : au-dessous, un créneau d'une demi-heure ne
porterait plus son titre.
*/
const SPAN_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;

function offsetOf(date: Date, day: Date): number {
  const minutes = (date.getTime() - startOfDay(day).getTime()) / 60_000;
  return ((minutes - DAY_START_HOUR * 60) / SPAN_MINUTES) * 100;
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
    <div className="flex min-h-0 flex-1 flex-col">
      {/* En-tête : jour, date, et la bande des journées entières. */}
      <div className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] border-b">
        <div className="border-r" />
        {days.map((day, index) => (
          <div
            key={day.toISOString()}
            className={cn(
              "flex items-center justify-center gap-1.5 border-r px-1 py-1 last:border-r-0",
              index >= 5 && "bg-muted/20",
            )}
          >
            <span className="text-muted-foreground text-[11px]">{WEEKDAYS[index]}</span>
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[13px] tabular-nums",
                isSameDay(day, today) && "bg-brand font-medium text-white",
              )}
            >
              {day.getDate()}
            </span>
          </div>
        ))}
      </div>

      {allDay.length > 0 && (
        <div className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] border-b">
          {/* Gouttière muette : « journée » écrit ici ne servait qu'à
              remplir une colonne dont la position dit déjà tout. */}
          <div className="border-r" />
          {days.map((day) => {
            const from = startOfDay(day).getTime();
            const items = allDay.filter(
              (o) => o.start.getTime() < from + DAY && o.end.getTime() > from,
            );
            return (
              <div
                key={day.toISOString()}
                className="flex flex-col gap-px border-r px-0.5 py-1 last:border-r-0"
              >
                {items.map((occurrence) => {
                  const style = occurrence.style;
                  return (
                    <button
                      key={occurrence.key}
                      type="button"
                      onClick={() => onSelect(occurrence)}
                      className={cn(
                        "h-4 truncate rounded-[3px] px-1.5 text-left text-[11px] leading-4 font-medium",
                        style.solid,
                      )}
                    >
                      {eventTitle(occurrence.event.summary)}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {/* Deux planchers, et le plus haut gagne : la hauteur disponible pour
            remplir la carte, la hauteur en pixels pour rester lisible quand la
            fenêtre est basse — auquel cas la grille défile. */}
        <div
          className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))]"
          style={{ minHeight: `max(100%, ${hours.length * HOUR_HEIGHT}px)` }}
        >
          {/* Colonne des heures. */}
          <div className="flex flex-col border-r">
            {hours.map((hour) => (
              <div
                key={hour}
                className="text-muted-foreground/70 relative flex-1 pr-1.5 text-right text-[10px] tabular-nums"
              >
                <span className="absolute -top-1.5 right-1.5">{hour}h</span>
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
              <div
                key={day.toISOString()}
                className={cn(
                  "relative flex flex-col border-r last:border-r-0",
                  day.getDay() % 6 === 0 && "bg-muted/20",
                )}
              >
                {hours.map((hour) => (
                  <div key={hour} className="flex-1 border-b last:border-b-0" />
                ))}

                {hasToday && isSameDay(day, today) && (
                  <div
                    className="bg-danger pointer-events-none absolute inset-x-0 z-10 h-px"
                    style={{ top: `${offsetOf(now, day)}%` }}
                  >
                    <span className="bg-danger absolute -top-1 -left-1 size-2 rounded-full" />
                  </div>
                )}

                {placed.map(({ occurrence, column, columns }) => {
                  const style = occurrence.style;
                  const top = offsetOf(occurrence.start, day);
                  const height = offsetOf(occurrence.end, day) - top;
                  const minutes =
                    (occurrence.end.getTime() - occurrence.start.getTime()) / 60_000;
                  const width = 100 / columns;

                  return (
                    <button
                      key={occurrence.key}
                      type="button"
                      onClick={() => onSelect(occurrence)}
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        minHeight: MIN_BLOCK,
                        left: `calc(${column * width}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                      }}
                      className={cn(
                        "absolute overflow-hidden rounded-[3px] border-l-2 px-1 py-px text-left leading-[13px]",
                        style.soft,
                        style.rail,
                        occurrence.event.status === "tentative" && "border border-dashed",
                      )}
                      title={`${formatRange(occurrence.start, occurrence.end, false)} — ${eventTitle(occurrence.event.summary)}`}
                    >
                      {/* Ce qui s'affiche suit la place disponible. Un créneau
                          de trente minutes n'a la place que de son titre, et
                          l'heure y serait de toute façon redondante avec la
                          gouttière juste à gauche. */}
                      <span className="block truncate text-[11px] font-medium">
                        {eventTitle(occurrence.event.summary)}
                      </span>
                      {minutes >= 40 && (
                        <span className="text-muted-foreground block truncate text-[10px]">
                          {formatRange(occurrence.start, occurrence.end, false)}
                        </span>
                      )}
                      {minutes >= 75 && occurrence.event.location && (
                        <span className="text-muted-foreground/80 block truncate text-[10px]">
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
