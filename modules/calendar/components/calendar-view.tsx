"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCalendar } from "../hooks/use-calendar";
import { VIEWS } from "../lib/labels";
import type { Occurrence } from "../lib/types";
import { AgendaList } from "./agenda-list";
import { CalendarSidebar } from "./calendar-sidebar";
import { EventDialog } from "./event-dialog";
import { MonthGrid } from "./month-grid";
import { WeekGrid } from "./week-grid";

/**
 * L'écran calendrier.
 *
 * Trois vues sur un même jeu d'occurrences : le mois pour situer, la semaine
 * pour organiser une journée, l'agenda pour lire ce qui vient. Les trois
 * partagent le curseur et la sélection d'agendas, si bien que passer de l'une à
 * l'autre ne fait jamais perdre le fil.
 *
 * Le contenu simule une synchronisation Google Agenda : les événements ont la
 * forme exacte de la ressource `events` de l'API, séries récurrentes dépliées
 * comprises. Brancher un vrai compte reviendrait à remplacer un `useMemo` par
 * un `fetch`.
 */
export function CalendarView() {
  const calendar = useCalendar();
  const [selected, setSelected] = useState<Occurrence | null>(null);
  const [syncedAt] = useState(() => new Date());

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold">Calendrier</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Visites, rendus d&apos;étude, rendez-vous clients et absences de
            l&apos;équipe.
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <CalendarSidebar
          calendars={calendar.calendars}
          onToggle={calendar.toggleCalendar}
          loaded={calendar.loaded}
          syncedAt={syncedAt}
        />

        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7" onClick={calendar.goToday}>
                Aujourd&apos;hui
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={calendar.goPrev}
                aria-label="Période précédente"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={calendar.goNext}
                aria-label="Période suivante"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
              <p className="ml-2 text-sm font-medium first-letter:uppercase">
                {calendar.label}
              </p>
            </div>

            <div className="bg-muted flex rounded-[4px] p-0.5">
              {VIEWS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => calendar.setView(entry.value)}
                  aria-pressed={calendar.view === entry.value}
                  className={cn(
                    "rounded-[3px] px-2.5 py-1 text-xs transition-colors",
                    calendar.view === entry.value
                      ? "bg-background text-foreground font-medium shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {calendar.view === "mois" && (
              <MonthGrid
                cursor={calendar.cursor}
                today={calendar.today}
                occurrences={calendar.occurrences}
                onSelect={setSelected}
                onOpenDay={calendar.openDay}
              />
            )}
            {calendar.view === "semaine" && (
              <WeekGrid
                cursor={calendar.cursor}
                today={calendar.today}
                now={syncedAt}
                occurrences={calendar.occurrences}
                onSelect={setSelected}
              />
            )}
            {calendar.view === "agenda" && (
              <AgendaList
                cursor={calendar.cursor}
                today={calendar.today}
                occurrences={calendar.occurrences}
                onSelect={setSelected}
              />
            )}
          </div>
        </Card>
      </div>

      <EventDialog occurrence={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
