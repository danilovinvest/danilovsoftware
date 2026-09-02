"use client";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/ui/feedback";
import { addDays, isSameDay, occurrencesForDay, startOfDay } from "../lib/events";
import { formatDayLong, formatRange } from "../lib/labels";
import type { Occurrence } from "../lib/types";

/**
 * La vue agenda : les trente jours qui viennent, jour par jour, sans les cases
 * vides. C'est la lecture qu'on veut le matin — pas une grille, une file.
 */
export function AgendaList({
  cursor,
  today,
  occurrences,
  onSelect,
}: {
  cursor: Date;
  today: Date;
  occurrences: Occurrence[];
  onSelect: (occurrence: Occurrence) => void;
}) {
  const days = Array.from({ length: 30 }, (_, index) => addDays(startOfDay(cursor), index))
    .map((day) => ({ day, items: occurrencesForDay(occurrences, day) }))
    .filter((entry) => entry.items.length > 0);

  if (days.length === 0) {
    return (
      <EmptyState
        title="Aucun événement"
        description="Rien n'est prévu sur les trente prochains jours dans les agendas affichés."
      />
    );
  }

  return (
    <div className="min-h-0 flex-1 divide-y overflow-y-auto">
      {days.map(({ day, items }) => (
        <div key={day.toISOString()} className="flex gap-4 px-4 py-3">
          <div className="w-40 shrink-0">
            <p
              className={cn(
                "text-sm font-medium first-letter:uppercase",
                isSameDay(day, today) && "text-brand",
              )}
            >
              {formatDayLong(day)}
            </p>
            <p className="text-muted-foreground text-[11px]">
              {items.length} événement{items.length > 1 ? "s" : ""}
            </p>
          </div>

          <ul className="min-w-0 flex-1 divide-y">
            {items.map((occurrence) => {
              const style = occurrence.style;
              return (
                <li key={occurrence.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(occurrence)}
                    className="hover:bg-accent/60 flex w-full items-start gap-3 rounded-[4px] px-2 py-1.5 text-left transition-colors"
                  >
                    <span
                      className={cn("mt-1.5 size-2 shrink-0 rounded-full", style.dot)}
                    />
                    <span className="text-muted-foreground w-28 shrink-0 text-xs tabular-nums">
                      {formatRange(occurrence.start, occurrence.end, occurrence.allDay)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {occurrence.event.summary}
                        {occurrence.event.status === "tentative" && (
                          <span className="text-warning ml-1.5 text-[11px]">
                            à confirmer
                          </span>
                        )}
                      </span>
                      {occurrence.event.location && (
                        <span className="text-muted-foreground block truncate text-[11px]">
                          {occurrence.event.location}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground/70 hidden shrink-0 text-[11px] sm:block">
                      {occurrence.calendarName}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
