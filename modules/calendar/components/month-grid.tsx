"use client";

import { cn } from "@/lib/utils";
import { isSameDay, isSameMonth, monthMatrix, startOfDay } from "../lib/events";
import { WEEKDAYS, eventTitle, formatTime } from "../lib/labels";
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
const BANNER_HEIGHT = 18;
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="text-muted-foreground grid shrink-0 grid-cols-7 border-b">
        {WEEKDAYS.map((label, index) => (
          <div
            key={label}
            className={cn(
              "px-2 py-1 text-center text-[10px] font-medium tracking-wide uppercase",
              index >= 5 && "text-muted-foreground/60",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Six rangées de hauteur égale, mais des cases qui **rognent** ce qui
          dépasse. Sans ce rognage, la journée la plus chargée poussait son
          « +2 autres » par-dessus le numéro du jour de la semaine suivante. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {weeks.map((week) => {
          const banners = weekBanners(week, occurrences);
          const lanes = banners.reduce((max, banner) => Math.max(max, banner.lane + 1), 0);
          const reserved = lanes * BANNER_HEIGHT;

          return (
            <div
              key={week[0].toISOString()}
              className="relative grid min-h-[6.25rem] flex-1 grid-cols-7 border-b last:border-b-0"
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
                // Chaque barre de plusieurs jours mange la hauteur d'une
                // pastille : en afficher autant qu'un jour sans barre revenait
                // à en peindre trois là où deux tiennent, et à rogner la
                // troisième au milieu.
                const room = Math.max(1, MAX_CHIPS - lanes);
                const shown = timed.slice(0, room);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "flex min-w-0 flex-col gap-px overflow-hidden border-r px-0.5 pt-1 pb-1 last:border-r-0",
                      outside && "bg-muted/40",
                      !outside && day.getDay() % 6 === 0 && "bg-muted/20",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenDay(day)}
                      className={cn(
                        "mx-auto flex size-[18px] shrink-0 items-center justify-center rounded-full text-[11px] tabular-nums transition-colors",
                        isSameDay(day, today)
                          ? "bg-brand text-white font-medium"
                          : outside
                            ? "text-muted-foreground/60 hover:bg-accent"
                            : "hover:bg-accent",
                      )}
                    >
                      {day.getDate()}
                    </button>

                    {/* Réserve la place des barres qui traversent la semaine.
                        `shrink-0` n'est pas décoratif : la case est une colonne
                        flex à hauteur bornée, et sans lui cette réserve se fait
                        écraser dès que la journée est chargée — les pastilles
                        remontent alors sous la barre, qui les recouvre. */}
                    <div style={{ height: reserved }} className="shrink-0" aria-hidden />

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
                        className="text-muted-foreground hover:text-foreground shrink-0 px-1.5 text-left text-[10px] leading-4"
                      >
                        +{timed.length - shown.length} autre
                        {timed.length - shown.length > 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Les barres multi-jours, au-dessus des cases. */}
              <div className="pointer-events-none absolute inset-x-0 top-[26px]">
                {banners.map((banner) => {
                  const style = banner.occurrence.style;
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
                        "pointer-events-auto absolute h-4 truncate px-1.5 text-left text-[11px] leading-4 font-medium",
                        style.solid,
                        banner.opensLeft ? "rounded-l-[3px]" : "",
                        banner.closesRight ? "rounded-r-[3px]" : "",
                      )}
                      title={eventTitle(banner.occurrence.event.summary)}
                    >
                      {/* Le titre est répété sur chaque semaine traversée. Un
                          « … » solitaire économiserait un peu de peinture et
                          obligerait à remonter d'une ligne pour savoir de quoi
                          il s'agit. */}
                      {!banner.opensLeft && "◂ "}
                      {eventTitle(banner.occurrence.event.summary)}
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

/**
 * Une pastille d'événement horaire.
 *
 * Sans fond : la couleur tient dans la puce, comme chez Google. Un aplat teinté
 * par événement transformait une semaine chargée en patchwork, et surtout il
 * mangeait la largeur — sur une case de calendrier mensuel, les quelques pixels
 * de remplissage sont exactement ceux qui manquent au titre pour être lisible.
 */
export function EventChip({
  occurrence,
  onSelect,
}: {
  occurrence: Occurrence;
  onSelect: (occurrence: Occurrence) => void;
}) {
  const style = occurrence.style;
  const tentative = occurrence.event.status === "tentative";

  return (
    <button
      type="button"
      onClick={() => onSelect(occurrence)}
      title={`${formatTime(occurrence.start)} ${eventTitle(occurrence.event.summary)}`}
      className="hover:bg-accent flex h-[17px] w-full min-w-0 shrink-0 items-center gap-1 rounded-[3px] px-1 text-left text-[11px] transition-colors"
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          style.dot,
          tentative && "ring-background ring-1 ring-inset",
        )}
      />
      <span className="text-muted-foreground shrink-0 tabular-nums">
        {formatTime(occurrence.start)}
      </span>
      <span className={cn("truncate", tentative && "italic")}>
        {eventTitle(occurrence.event.summary)}
      </span>
    </button>
  );
}
