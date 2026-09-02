"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePermission } from "@/modules/auth";
import { errorMessage } from "@/shared/api/errors";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { updateEvent } from "../lib/api";
import { useCalendar } from "../hooks/use-calendar";
import { VIEWS } from "../lib/labels";
import type { Occurrence } from "../lib/types";
import type { Range } from "./event-form";

/** AAAA-MM-JJ en heure locale : ce que l'API attend d'une journée entière. */
function dayValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
import { AgendaList } from "./agenda-list";
import { CalendarSidebar } from "./calendar-sidebar";
import { EventDialog } from "./event-dialog";
import { EventForm } from "./event-form";
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
 * Le contenu est la copie de l'agenda Google de l'entreprise, tenue à jour par
 * l'API. Les événements sont les ressources `events` de Google, intactes, avec
 * leurs séries déjà dépliées en occurrences — le CRM n'a aucune RRULE à
 * interpréter pour peindre une grille.
 */
export function CalendarView() {
  const calendar = useCalendar();
  const canWrite = usePermission("calendar:write");
  const [selected, setSelected] = useState<Occurrence | null>(null);
  const [now] = useState(() => new Date());
  // `editing` porte l'événement à modifier, `creating` les bornes tracées.
  // Deux états distincts plutôt qu'un seul nullable : « créer du 14 au 18 » et
  // « modifier ce rendez-vous » ne se confondent pas.
  const [editing, setEditing] = useState<Occurrence | null>(null);
  const [creating, setCreating] = useState<Range | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreation(from: Date, to: Date, allDay: boolean) {
    setEditing(null);
    setCreating({ from, to, allDay });
    setFormOpen(true);
  }

  function openEdition(occurrence: Occurrence) {
    setSelected(null);
    setCreating(null);
    setEditing(occurrence);
    setFormOpen(true);
  }

  /*
   * Déplacer ou redimensionner écrit tout de suite, sans passer par le
   * formulaire.
   *
   * C'est le propre du geste : on a déjà dit ce qu'on voulait en lâchant le
   * bloc au bon endroit, une fenêtre de confirmation ne ferait que redemander.
   * La réponse remplace l'événement dans la liste chargée — sans quoi il
   * reviendrait à sa place le temps d'un rechargement.
   */
  async function move(occurrence: Occurrence, start: Date, end: Date) {
    setError(null);
    const event = occurrence.event;
    try {
      const updated = await updateEvent(event.id, {
        calendar_id: event.calendar_id,
        title: event.title,
        description: event.description,
        location: event.location,
        all_day: event.all_day,
        start: event.all_day ? dayValue(start) : start.toISOString(),
        end: event.all_day ? dayValue(end) : end.toISOString(),
      });
      calendar.replace(updated);
    } catch (cause) {
      setError(errorMessage(cause));
      calendar.reload();
    }
  }

  /** Déplacement d'un jour à l'autre dans la grille mensuelle : l'heure et la
   * durée sont conservées, seule la date change. */
  function moveToDay(occurrence: Occurrence, day: Date) {
    const length = occurrence.end.getTime() - occurrence.start.getTime();
    const start = new Date(day);
    start.setHours(
      occurrence.start.getHours(),
      occurrence.start.getMinutes(),
      0,
      0,
    );
    return move(occurrence, start, new Date(start.getTime() + length));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold">Calendrier</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
Rendez-vous, visites de chantier et absences de l&apos;équipe.
          </p>
        </div>

        {canWrite && calendar.ready && (
          <Button size="sm" onClick={() => openCreation(calendar.today, calendar.today, false)}>
            <PlusIcon />
            Nouvel événement
          </Button>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <CalendarSidebar
          calendars={calendar.calendars}
          onToggle={calendar.toggleCalendar}
          loaded={calendar.loaded}
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
            {error && (
              <div className="px-3 pt-3">
                <ErrorNotice message={error} />
              </div>
            )}
            {calendar.error && (
              <EmptyState
                title="Agenda indisponible"
                description={calendar.error}
              />
            )}
            {!calendar.error && !calendar.loading && !calendar.ready && (
              <EmptyState
                title="Aucun agenda"
                description="Créez-en un, ou importez ceux d'un compte Google."
                action={
                  <Button asChild size="sm">
                    <Link href="/settings/agenda">Ouvrir les réglages</Link>
                  </Button>
                }
              />
            )}
            {!calendar.error && calendar.ready && calendar.view === "mois" && (
              <MonthGrid
                cursor={calendar.cursor}
                today={calendar.today}
                occurrences={calendar.occurrences}
                onSelect={setSelected}
                onOpenDay={calendar.openDay}
                onCreate={canWrite ? openCreation : undefined}
                onMove={canWrite ? moveToDay : undefined}
              />
            )}
            {!calendar.error && calendar.ready && calendar.view === "semaine" && (
              <WeekGrid
                cursor={calendar.cursor}
                today={calendar.today}
                now={now}
                occurrences={calendar.occurrences}
                onSelect={setSelected}
                onCreate={
                  canWrite ? (from, to) => openCreation(from, to, false) : undefined
                }
                onMove={canWrite ? move : undefined}
              />
            )}
            {!calendar.error && calendar.ready && calendar.view === "agenda" && (
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

      <EventDialog
        occurrence={selected}
        onClose={() => setSelected(null)}
        onEdit={canWrite ? openEdition : undefined}
      />

      <EventForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={calendar.reload}
        calendars={calendar.rawCalendars}
        event={editing?.event ?? null}
        range={creating}
      />
    </div>
  );
}
