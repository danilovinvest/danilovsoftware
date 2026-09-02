"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePermission } from "@/modules/auth";
import { EmptyState } from "@/shared/ui/feedback";
import { useCalendar } from "../hooks/use-calendar";
import { VIEWS } from "../lib/labels";
import type { Occurrence } from "../lib/types";
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
  // `editing` porte l'événement à modifier, `creating` le jour pré-rempli.
  // Deux états distincts plutôt qu'un seul nullable : « créer le 3 septembre »
  // et « modifier ce rendez-vous » ne se confondent pas.
  const [editing, setEditing] = useState<Occurrence | null>(null);
  const [creating, setCreating] = useState<Date | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  function openCreation(at: Date) {
    setEditing(null);
    setCreating(at);
    setFormOpen(true);
  }

  function openEdition(occurrence: Occurrence) {
    setSelected(null);
    setCreating(null);
    setEditing(occurrence);
    setFormOpen(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold">Calendrier</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            L&apos;agenda Google de l&apos;entreprise, dans le CRM.
          </p>
        </div>

        {canWrite && calendar.connected && (
          <Button size="sm" onClick={() => openCreation(calendar.today)}>
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
          syncedAt={calendar.syncedAt}
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
            {calendar.error && (
              <EmptyState
                title="Agenda indisponible"
                description={calendar.error}
              />
            )}
            {!calendar.error && !calendar.loading && !calendar.connected && (
              <EmptyState
                title="Aucun agenda raccordé"
                description="Le CRM recopie l'agenda Google de l'entreprise, en lecture seule. Le raccordement se fait une fois, depuis les réglages."
                action={
                  <Button asChild size="sm">
                    <Link href="/settings/agenda">Raccorder un compte Google</Link>
                  </Button>
                }
              />
            )}
            {!calendar.error && calendar.connected && calendar.view === "mois" && (
              <MonthGrid
                cursor={calendar.cursor}
                today={calendar.today}
                occurrences={calendar.occurrences}
                onSelect={setSelected}
                onOpenDay={calendar.openDay}
                onCreate={canWrite ? openCreation : undefined}
              />
            )}
            {!calendar.error && calendar.connected && calendar.view === "semaine" && (
              <WeekGrid
                cursor={calendar.cursor}
                today={calendar.today}
                now={now}
                occurrences={calendar.occurrences}
                onSelect={setSelected}
                onCreate={canWrite ? openCreation : undefined}
              />
            )}
            {!calendar.error && calendar.connected && calendar.view === "agenda" && (
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
        day={creating}
      />
    </div>
  );
}
