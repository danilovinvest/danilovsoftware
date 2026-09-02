"use client";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/ui/feedback";
import { addDays, isSameDay, occurrencesForDay, startOfDay } from "../lib/events";
import { eventTitle, formatDayLong, formatRange } from "../lib/labels";
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
        <div key={day.toISOString()} className="flex gap-3 px-3 py-2">
          <div className="w-40 shrink-0 pt-1">
            <p
              className={cn(
                "text-[13px] font-medium first-letter:uppercase",
                isSameDay(day, today) && "text-brand",
              )}
            >
              {formatDayLong(day)}
            </p>
            <p className="text-muted-foreground/70 text-[11px]">
              {items.length} événement{items.length > 1 ? "s" : ""}
            </p>
          </div>

          <ul className="min-w-0 flex-1">
            {items.map((occurrence) => {
              const style = occurrence.style;
              return (
                <li key={occurrence.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(occurrence)}
                    className="hover:bg-accent/60 flex w-full items-baseline gap-2.5 rounded-[4px] px-2 py-1 text-left transition-colors"
                  >
                    <span
                      className={cn("size-1.5 shrink-0 translate-y-[-1px] rounded-full", style.dot)}
                    />
                    <span className="text-muted-foreground w-24 shrink-0 text-[11px] tabular-nums">
                      {formatRange(occurrence.start, occurrence.end, occurrence.allDay)}
                    </span>
                    {/* Titre et lieu sur une seule ligne : le lieu tient en
                        trois mots et lui donner sa propre ligne doublait la
                        hauteur d'une liste faite pour être parcourue. */}
                    <span className="min-w-0 flex-1 truncate text-[13px]">
                      {eventTitle(occurrence.event.summary)}
                      {occurrence.event.location && (
                        <span className="text-muted-foreground/70">
                          {" · "}
                          {occurrence.event.location}
                        </span>
                      )}
                      {occurrence.event.status === "tentative" && (
                        <span className="text-warning ml-1.5 text-[11px]">à confirmer</span>
                      )}
                    </span>
                    <span className="text-muted-foreground/60 hidden shrink-0 text-[11px] sm:block">
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
