"use client";

import { cn } from "@/lib/utils";
import { calendarById, isSameDay, isSameMonth, monthMatrix, startOfDay } from "../lib/events";
import { CALENDAR_STYLE, WEEKDAYS, formatTime } from "../lib/labels";
import type { Occurrence } from "../lib/types";

/**
 * La grille mensuelle.
 *
 * Deux couches se superposent dans chaque semaine : une bande d'événements de
 * plusieurs jours, posée en absolu et qui traverse les cases, et les
 * événements horaires listés dans leur case. C'est la seule façon de rendre
 * « Congés du mercredi au vendredi » comme une barre continue plutôt que comme
 * trois pastilles identiques que l'œil ne relie pas.
 */

const DAY = 86_400_000;
const BANNER_HEIGHT = 20;
const MAX_CHIPS = 3;

type Banner = {
  occurrence: Occurrence;
  from: number;
  span: number;
  lane: number;
  /** L'événement commence-t-il vraiment dans cette semaine ? */
  opensLeft: boolean;
  closesRight: boolean;
};

/** Découpe les événements de plusieurs jours en barres clipées sur la semaine. */
function weekBanners(week: Date[], occurrences: Occurrence[]): Banner[] {
  const weekStart = week[0].getTime();
  const weekEnd = weekStart + 7 * DAY;

  const spanning = occurrences
    .filter((o) => o.allDay && o.start.getTime() < weekEnd && o.end.getTime() > weekStart)
    .sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime() ||
        b.end.getTime() - b.start.getTime() - (a.end.getTime() - a.start.getTime()),
    );

  // Attribution de couloirs : une barre se pose sur le premier couloir libre à
  // sa gauche, comme le fait Google.
  const lanes: number[] = [];
  return spanning.map((occurrence) => {
    const from = Math.max(0, Math.round((occurrence.start.getTime() - weekStart) / DAY));
    const to = Math.min(7, Math.round((occurrence.end.getTime() - weekStart) / DAY));
    const span = Math.max(1, to - from);

    let lane = lanes.findIndex((end) => end <= from);
    if (lane === -1) lane = lanes.length;
    lanes[lane] = from + span;

    return {
      occurrence,
      from,
      span,
      lane,
      opensLeft: occurrence.start.getTime() >= weekStart,
      closesRight: occurrence.end.getTime() <= weekEnd,
    };
  });
}

export function MonthGrid({
  cursor,
  today,
  occurrences,
  onSelect,
  onOpenDay,
}: {
  cursor: Date;
  today: Date;
  occurrences: Occurrence[];
  onSelect: (occurrence: Occurrence) => void;
  onOpenDay: (day: Date) => void;
}) {
  const days = monthMatrix(cursor);
  const weeks = Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7));

  return (
    <div className="flex min-h-[38rem] flex-1 flex-col">
      <div className="text-muted-foreground grid grid-cols-7 border-b">
        {WEEKDAYS.map((label) => (
          <div key={label} className="px-2 py-1.5 text-center text-[11px] font-medium">
            {label}
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col">
        {weeks.map((week) => {
          const banners = weekBanners(week, occurrences);
          const lanes = banners.reduce((max, banner) => Math.max(max, banner.lane + 1), 0);
          const reserved = lanes * BANNER_HEIGHT;

          return (
            <div
              key={week[0].toISOString()}
              className="relative grid flex-1 grid-cols-7 border-b last:border-b-0"
            >
              {week.map((day) => {
                const outside = !isSameMonth(day, cursor);
                const timed = occurrences
                  .filter(
                    (o) =>
                      !o.allDay &&
                      o.start.getTime() >= startOfDay(day).getTime() &&
                      o.start.getTime() < startOfDay(day).getTime() + DAY,
                  )
                  .sort((a, b) => a.start.getTime() - b.start.getTime());
                const shown = timed.slice(0, MAX_CHIPS);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "flex min-w-0 flex-col gap-0.5 border-r p-1 last:border-r-0",
                      outside && "bg-muted/40",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenDay(day)}
                      className={cn(
                        "mx-auto flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] tabular-nums transition-colors",
                        isSameDay(day, today)
                          ? "bg-brand text-white font-medium"
                          : outside
                            ? "text-muted-foreground/60 hover:bg-accent"
                            : "hover:bg-accent",
                      )}
                    >
                      {day.getDate()}
                    </button>

                    {/* Réserve la place des barres qui traversent la semaine. */}
                    <div style={{ height: reserved }} aria-hidden />

                    {shown.map((occurrence) => (
                      <EventChip
                        key={occurrence.key}
                        occurrence={occurrence}
                        onSelect={onSelect}
                      />
                    ))}

                    {timed.length > shown.length && (
                      <button
                        type="button"
                        onClick={() => onOpenDay(day)}
                        className="text-muted-foreground hover:text-foreground px-1 text-left text-[11px]"
                      >
                        +{timed.length - shown.length} autre
                        {timed.length - shown.length > 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Les barres multi-jours, au-dessus des cases. */}
              <div className="pointer-events-none absolute inset-x-0 top-7">
                {banners.map((banner) => {
                  const calendar = calendarById(banner.occurrence.event.calendarId);
                  const style = calendar ? CALENDAR_STYLE[calendar.colorKey] : null;
                  return (
                    <button
                      key={banner.occurrence.key}
                      type="button"
                      onClick={() => onSelect(banner.occurrence)}
                      style={{
                        left: `calc(${(banner.from / 7) * 100}% + 4px)`,
                        width: `calc(${(banner.span / 7) * 100}% - 8px)`,
                        top: banner.lane * BANNER_HEIGHT,
                      }}
                      className={cn(
                        "pointer-events-auto absolute h-4.5 truncate px-1.5 text-left text-[11px] leading-[18px] font-medium",
                        style?.solid,
                        banner.opensLeft ? "rounded-l-[3px]" : "",
                        banner.closesRight ? "rounded-r-[3px]" : "",
                      )}
                      title={banner.occurrence.event.summary}
                    >
                      {banner.opensLeft ? banner.occurrence.event.summary : "…"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Une pastille d'événement horaire : heure, puis intitulé, sur une ligne. */
export function EventChip({
  occurrence,
  onSelect,
}: {
  occurrence: Occurrence;
  onSelect: (occurrence: Occurrence) => void;
}) {
  const calendar = calendarById(occurrence.event.calendarId);
  const style = calendar ? CALENDAR_STYLE[calendar.colorKey] : null;
  const tentative = occurrence.event.status === "tentative";

  return (
    <button
      type="button"
      onClick={() => onSelect(occurrence)}
      title={`${formatTime(occurrence.start)} ${occurrence.event.summary}`}
      className={cn(
        "flex w-full min-w-0 items-center gap-1 rounded-[3px] px-1 py-0.5 text-left text-[11px] transition-colors",
        style?.soft,
        tentative && "border border-dashed",
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", style?.dot)} />
      <span className="text-muted-foreground shrink-0 tabular-nums">
        {formatTime(occurrence.start)}
      </span>
      <span className="truncate">{occurrence.event.summary}</span>
    </button>
  );
}
