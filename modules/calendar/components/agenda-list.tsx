"use client";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/ui/feedback";
import { addDays, isSameDay, occurrencesForDay, startOfDay } from "../lib/events";
import { EVENT_KIND_TONE, formatDayLong, formatRange } from "../lib/labels";
import type { Occurrence } from "../lib/types";

/**
 * La vue agenda : les trente jours qui viennent, jour par jour, sans les cases
 * vides. C'est la lecture qu'on veut le matin — pas une grille, une file.
 *
 * C'est aussi la vue par défaut d'un téléphone. Sous `sm`, le jour passe
 * au-dessus de ses événements : une colonne de 160 pixels en laissait à peine
 * cent au titre sur un écran de 390.
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
    <div className="min-h-0 flex-1 divide-y overflow-y-auto" data-demo="agenda-list">
      {days.map(({ day, items }) => (
        <div key={day.toISOString()} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:gap-3">
          <div className="flex shrink-0 items-baseline gap-2 pt-1 sm:block sm:w-40">
            <p
              className={cn(
                "text-[13px] font-medium first-letter:uppercase",
                isSameDay(day, today) && "text-brand-text",
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
                    className="hover:bg-accent/60 flex w-full items-baseline gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors sm:py-1"
                  >
                    <span
                      className={cn("size-1.5 shrink-0 translate-y-[-1px] rounded-full", style.dot)}
                    />
                    {/* Un liseré de catégorie plutôt qu'un mot : la file se
                        parcourt, et cinq libellés répétés trente fois la
                        rendraient illisible. Le mot reste dans la fiche. */}
                    <span
                      aria-hidden
                      className={cn(
                        "h-3 w-0.5 shrink-0 translate-y-[1px] rounded-full",
                        EVENT_KIND_TONE[occurrence.event.kind],
                      )}
                    />
                    <span className="text-muted-foreground w-20 shrink-0 text-[11px] tabular-nums sm:w-24">
                      {formatRange(occurrence.start, occurrence.end, occurrence.allDay)}
                    </span>
                    {/* Titre et lieu sur une seule ligne : le lieu tient en
                        trois mots et lui donner sa propre ligne doublait la
                        hauteur d'une liste faite pour être parcourue. */}
                    <span className="min-w-0 flex-1 truncate text-[13px]">
                      {occurrence.event.title}
                      {/* La fiche rattachée passe avant le lieu : « Dupont »
                          dit à qui on a affaire, « Cannes » ne le dit pas. */}
                      {occurrence.event.customer_name && (
                        <span className="text-info/80">
                          {" · "}
                          {occurrence.event.customer_name}
                        </span>
                      )}
                      {occurrence.event.location && (
                        <span className="text-muted-foreground/70">
                          {" · "}
                          {occurrence.event.location}
                        </span>
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
