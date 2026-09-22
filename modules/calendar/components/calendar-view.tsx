"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, KeyboardIcon, PlusIcon, UserIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth, usePermission } from "@/modules/auth";
import { errorMessage } from "@/shared/api/errors";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { updateEvent } from "../lib/api";
import { useCalendar } from "../hooks/use-calendar";
import { VIEWS } from "../lib/labels";
import type { Occurrence } from "../lib/types";
import { EMPTY_JALONS } from "../lib/types";
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
  const { account } = useAuth();
  const calendar = useCalendar(account?.id ?? null);
  const canWrite = usePermission("calendar:write");
  const [selected, setSelected] = useState<Occurrence | null>(null);
  const [now] = useState(() => new Date());
  // `editing` porte l'événement à modifier, `creating` les bornes tracées.
  // Deux états distincts plutôt qu'un seul nullable : « créer du 14 au 18 » et
  // « modifier ce rendez-vous » ne se confondent pas.
  const [editing, setEditing] = useState<Occurrence | null>(null);
  const [creating, setCreating] = useState<Range | null>(null);
  const [template, setTemplate] = useState<Occurrence | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Une heure de départ proposable, sur un jour donné.
   *
   * Le bouton et le raccourci passaient le jour à minuit : le formulaire
   * s'ouvrait sur « 00:00 – 00:00 », un événement de durée nulle au milieu de
   * la nuit, qu'il fallait corriger à chaque fois. On propose le prochain quart
   * d'heure quand c'est aujourd'hui — les créneaux de saisie sont au quart
   * d'heure — et neuf heures pour un autre jour, qui est le début de la journée
   * de l'entreprise.
   */
  function creneau(jour: Date): { from: Date; to: Date } {
    const from = new Date(jour);
    const maintenant = new Date();
    if (from.toDateString() === maintenant.toDateString()) {
      from.setHours(maintenant.getHours(), Math.ceil(maintenant.getMinutes() / 15) * 15, 0, 0);
    } else {
      from.setHours(9, 0, 0, 0);
    }
    return { from, to: new Date(from.getTime() + 3_600_000) };
  }

  function openCreation(from: Date, to: Date, allDay: boolean) {
    /*
      Un clic sur un jour ne dit pas une heure.

      La grille du mois rend `from === to` — le jour à minuit, deux fois — et le
      formulaire s'ouvrait sur « 00:00 → 00:00 », un événement de durée nulle au
      milieu de la nuit qu'il fallait corriger à chaque fois. La correction est
      ici et non dans la grille : `openCreation` est le seul passage obligé, et
      la poser dans chaque vue reviendrait à l'oublier dans la prochaine.
    */
    if (!allDay && to.getTime() <= from.getTime()) {
      const creneau_ = creneau(from);
      from = creneau_.from;
      to = creneau_.to;
    }
    setEditing(null);
    setTemplate(null);
    setCreating({ from, to, allDay });
    setFormOpen(true);
  }

  /** Dupliquer propose le lendemain : recopier un rendez-vous à la même heure
   * le même jour n'arrive jamais, le décaler d'un jour presque toujours. */
  function openDuplication(occurrence: Occurrence) {
    const length = occurrence.end.getTime() - occurrence.start.getTime();
    const from = new Date(occurrence.start.getTime() + 86_400_000);
    setSelected(null);
    setEditing(null);
    setTemplate(occurrence);
    setCreating({ from, to: new Date(from.getTime() + length), allDay: occurrence.allDay });
    setFormOpen(true);
  }

  function openEdition(occurrence: Occurrence) {
    setSelected(null);
    setTemplate(null);
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
        // Le rattachement et la catégorie repartent tels quels : l'écriture
        // remplace l'événement entier, et déplacer un rendez-vous de deux
        // heures ne doit pas le détacher de sa fiche.
        customer_id: event.customer_id,
        project_id: event.project_id,
        // Le collègue aussi : déplacer son rendez-vous ne le lui retire pas.
        assignee_id: event.assignee_id,
        // La couleur aussi : glisser un bloc de deux heures ne doit pas le
        // repeindre en gris.
        color: event.event_color,
        kind: event.kind,
        // Aucun jalon : glisser un événement ne dit rien de neuf sur l'affaire.
        // Les champs vides n'effacent rien, c'est ce qui rend ce geste sûr —
        // déplacer « Début Toiture » d'un jour ne doit pas décocher son PV.
        jalons: EMPTY_JALONS,
        start: event.all_day ? dayValue(start) : start.toISOString(),
        end: event.all_day ? dayValue(end) : end.toISOString(),
      });
      calendar.replace(updated);
    } catch (cause) {
      setError(errorMessage(cause));
      calendar.reload();
    }
  }

  /*
   * Raccourcis clavier, dans l'esprit de Google Agenda.
   *
   * Ils sont désarmés dès qu'on saisit du texte ou qu'une fenêtre est
   * ouverte : taper « n » dans le titre d'un événement ne doit pas en ouvrir
   * un second. Les modificateurs sont également exclus — ⌘S appartient au
   * navigateur, pas à nous.
   */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (formOpen || selected) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, [contenteditable='true']") ||
        target?.closest("[role='dialog']")
      ) {
        return;
      }

      switch (event.key) {
        case "t":
          calendar.goToday();
          break;
        case "ArrowLeft":
          calendar.goPrev();
          break;
        case "ArrowRight":
          calendar.goNext();
          break;
        case "m":
          calendar.setView("mois");
          break;
        case "s":
          calendar.setView("semaine");
          break;
        case "a":
          calendar.setView("agenda");
          break;
        case "n":
        case "c":
          if (canWrite && calendar.ready) {
            event.preventDefault();
            {
              const { from, to } = creneau(calendar.cursor);
              openCreation(from, to, false);
            }
          }
          break;
        default:
          return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // sans tableau de dépendances : la fermeture doit voir l'état courant.

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
          <h1 className="text-base font-semibold">Agenda</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
Rendez-vous, visites de chantier et absences de l&apos;équipe.
          </p>
        </div>

        {canWrite && calendar.ready && (
          <Button
            size="sm"
            onClick={() => {
              const { from, to } = creneau(calendar.today);
              openCreation(from, to, false);
            }}
          >
            <PlusIcon />
            Nouvel événement
          </Button>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <CalendarSidebar
          calendars={calendar.calendars}
          onToggle={calendar.toggleCalendar}
          kinds={calendar.kinds}
          onToggleKind={calendar.toggleKind}
          loaded={calendar.loaded}
        />

        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
            <div className="flex items-center gap-1">
              {/*
                Mes rendez-vous : ceux posés pour moi, ou par moi. Le choix est
                retenu sur ce poste, comme la vue.
              */}
              <Button
                variant={calendar.mine ? "default" : "outline"}
                size="sm"
                className="h-7"
                aria-pressed={calendar.mine}
                data-demo="agenda-mine"
                onClick={calendar.toggleMine}
              >
                <UserIcon />
                Mes rendez-vous
              </Button>
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

            <ShortcutsHelp />

            <div className="bg-muted flex rounded-md p-0.5">
              {VIEWS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => calendar.setView(entry.value)}
                  aria-pressed={calendar.view === entry.value}
                  className={cn(
                    "rounded-sm px-2.5 py-1 text-xs transition-colors",
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
        onDuplicate={canWrite ? openDuplication : undefined}
      />

      <EventForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={calendar.reload}
        calendars={calendar.rawCalendars}
        event={editing?.event ?? null}
        range={creating}
        template={template?.event ?? null}
        // Ce que l'agenda porte déjà : le calendrier de la date le montre, jour
        // par jour, pour qu'un créneau se choisisse en voyant ce qu'il y a
        // autour plutôt qu'en refermant le formulaire pour aller vérifier.
        occurrences={calendar.occurrences}
      />
    </div>
  );
}

/** Les raccourcis, à portée de clic. Les apprendre par hasard n'arrive pas ;
 * les cacher derrière une combinaison qu'il faut déjà connaître non plus. */
function ShortcutsHelp() {
  const shortcuts: Array<[string, string]> = [
    ["T", "Aujourd'hui"],
    ["← →", "Période précédente / suivante"],
    ["M", "Vue mois"],
    ["S", "Vue semaine"],
    ["A", "Vue agenda"],
    ["N", "Nouvel événement"],
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Raccourcis clavier"
        >
          <KeyboardIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="mb-2 text-xs font-medium">Raccourcis</p>
        <ul className="flex flex-col gap-1.5">
          {shortcuts.map(([keys, label]) => (
            <li key={keys} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{label}</span>
              <kbd className="bg-muted rounded-sm px-1.5 py-0.5 font-mono text-[10px]">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground/70 mt-3 border-t pt-2 text-[11px] leading-relaxed">
          Glissez sur plusieurs jours pour créer un événement qui les couvre, ou
          sur des heures pour tracer un créneau. Un bloc se déplace en le
          saisissant, se rallonge par son bord inférieur.
        </p>
      </PopoverContent>
    </Popover>
  );
}
