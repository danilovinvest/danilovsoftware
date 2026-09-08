"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/shared/api/errors";
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { DateField, TimeField } from "@/shared/ui/date-time-field";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { CustomerPicker } from "@/modules/customers";
import * as api from "../lib/api";
import { EVENT_KIND, EVENT_KIND_OPTIONS } from "../lib/labels";
import type { Calendar, CalendarEvent, EventKind } from "../lib/types";

/**
 * Créer ou modifier un rendez-vous.
 *
 * Ce que le formulaire écrit part chez Google et n'existe qu'là : il n'y a pas
 * d'événement propre au CRM. Un rendez-vous posé ici apparaît dans Google
 * Agenda, sur les téléphones, dans les notifications — et réciproquement, ce
 * qui est déplacé depuis un téléphone revient ici. Une copie locale modifiable
 * de son côté donnerait deux agendas qui divergent au premier changement.
 *
 * Les invités ne s'éditent pas d'ici. Les ajouter enverrait de vraies
 * invitations par courriel à de vrais clients, et cette décision se prend là où
 * l'on voit qui reçoit quoi. Une modification depuis le CRM les préserve : le
 * serveur envoie un PATCH, jamais un remplacement complet.
 */
export function EventForm({
  open,
  onClose,
  onSaved,
  calendars,
  /** Événement à modifier ; absent, on en crée un. */
  event,
  /** Bornes tracées à la souris, pré-remplies à la création. */
  range,
  /** Événement dont on repart pour en créer un nouveau. */
  template,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  calendars: Calendar[];
  event?: CalendarEvent | null;
  range?: Range | null;
  template?: CalendarEvent | null;
}) {
  // Le formulaire est remonté à chaque ouverture : la clé change avec la cible,
  // et l'état initial se calcule une fois, dans l'initialiseur du useState.
  const key = `${open}:${event?.id ?? template?.id ?? "nouveau"}:${range?.from.toISOString() ?? ""}:${range?.to.toISOString() ?? ""}`;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <FormBody
            key={key}
            onClose={onClose}
            onSaved={onSaved}
            calendars={calendars}
            event={event ?? null}
            range={range ?? null}
            template={template ?? null}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type Draft = {
  calendarId: string;
  /** De quoi il s'agit. Voir `EVENT_KIND`. */
  kind: EventKind;
  /** La fiche concernée, nulle pour ce qui ne concerne aucun client. */
  customerId: string | null;
  /** Son nom, gardé pour l'afficher sans réinterroger le serveur. */
  customerName: string;
  title: string;
  location: string;
  description: string;
  allDay: boolean;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
};

function FormBody({
  onClose,
  onSaved,
  calendars,
  event,
  range,
  template,
}: {
  onClose: () => void;
  onSaved: () => void;
  calendars: Calendar[];
  event: CalendarEvent | null;
  range: Range | null;
  template: CalendarEvent | null;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    initial(event, range, calendars, template),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = <K extends keyof Draft>(field: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [field]: value }));

  async function save() {
    setPending(true);
    setError(null);
    try {
      const input = {
        calendar_id: draft.calendarId,
        title: draft.title,
        location: draft.location,
        description: draft.description,
        all_day: draft.allDay,
        customer_id: draft.customerId,
        kind: draft.kind,
        ...bounds(draft),
      };
      if (event) await api.updateEvent(event.id, input);
      else await api.createEvent(input);
      onSaved();
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!event) return;
    setPending(true);
    setError(null);
    try {
      await api.deleteEvent(event.id);
      onSaved();
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  if (calendars.length === 0) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-base">Aucun agenda</DialogTitle>
          <DialogDescription>
            Créez un agenda dans Réglages → Agenda avant de poser un
            rendez-vous.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base">
          {event ? "Modifier l'événement" : "Nouvel événement"}
        </DialogTitle>
        <DialogDescription>
          {event?.imported
            ? "Cet événement vient d'un import Google. Le corriger ici ne remonte pas chez Google, et un import ultérieur ne défera pas la correction."
            : "Il vit dans le CRM et n'est visible que de ceux qui y ont accès."}
        </DialogDescription>
      </DialogHeader>

      {error && <ErrorNotice message={error} />}

      <div className="flex flex-col gap-3">
        <TextField
          label="Titre"
          required
          autoFocus
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Visite de chantier — Villa Roquefort"
        />

        <SelectField
          label="Agenda"
          required
          value={draft.calendarId}
          onValueChange={(value) => set("calendarId", value)}
          options={calendars.map((calendar) => ({
            value: calendar.id,
            label: calendar.name,
          }))}
        />

        <div className="flex items-center gap-2">
          <Switch
            id="all-day"
            checked={draft.allDay}
            onCheckedChange={(next) => set("allDay", next)}
          />
          <Label htmlFor="all-day" className="text-sm font-normal">
            Toute la journée
          </Label>
        </div>

        {draft.allDay ? (
          <div className="grid grid-cols-2 gap-3">
            <DateField
              label="Du"
              value={draft.date}
              onChange={(value) => set("date", value)}
            />
            <DateField
              label="Au"
              hint="Dernier jour inclus"
              value={draft.endDate}
              onChange={(value) => set("endDate", value)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_7rem_9rem] gap-3">
            <DateField
              label="Date"
              value={draft.date}
              onChange={(value) => set("date", value)}
            />
            <TimeField
              label="Début"
              value={draft.startTime}
              onChange={(value) => {
                // Déplacer le début décale la fin d'autant : on garde la durée
                // qu'on venait de choisir plutôt que de la voir se retourner.
                const shift = minutes(value) - minutes(draft.startTime);
                setDraft((current) => ({
                  ...current,
                  startTime: value,
                  endTime: clock(Math.min(minutes(current.endTime) + shift, 23 * 60 + 45)),
                }));
              }}
            />
            <TimeField
              label="Fin"
              after={draft.startTime}
              value={draft.endTime}
              onChange={(value) => set("endTime", value)}
            />
          </div>
        )}

        <TextField
          label="Lieu"
          value={draft.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="Cannes, chemin des Colles"
        />

        <TextAreaField
          label="Description"
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          className="min-h-16"
        />

        {event && event.attendees.length > 0 && (
          <p className="text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 text-[11px]">
            {event.attendees.length} invité
            {event.attendees.length > 1 ? "s" : ""}, recopiés lors de
            l&apos;import. Ils sont conservés tels quels : le CRM n&apos;envoie
            aucune invitation, il ne peut donc pas prétendre gérer une liste de
            convives.
          </p>
        )}
      </div>

      <DialogFooter className="sm:justify-between">
        {event ? (
          <Button
            variant="ghost"
            className="text-danger hover:text-danger"
            onClick={remove}
            disabled={pending}
          >
            <Trash2Icon className="size-4" />
            Supprimer
          </Button>
        ) : (
          <span />
        )}
        <span className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={save} disabled={pending || !draft.title.trim()}>
            {pending && <Spinner />}
            {event ? "Enregistrer" : "Créer"}
          </Button>
        </span>
      </DialogFooter>
    </>
  );
}

/* --- Conversions ------------------------------------------------------------
 *
 * Le formulaire manipule des champs de saisie natifs — `date` et `time` — donc
 * des chaînes locales. Google veut un instant avec son décalage, ou une date
 * seule. La traduction se fait ici, aux deux bouts, et nulle part ailleurs.
 */

function minutes(value: string): number {
  const [hours, mins] = value.split(":").map(Number);
  return (hours || 0) * 60 + (mins || 0);
}

function clock(total: number): string {
  const safe = Math.max(0, total);
  return `${pad(Math.floor(safe / 60) % 24)}:${pad(safe % 60)}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Bornes tracées à la souris dans une grille. */
export type Range = { from: Date; to: Date; allDay: boolean };

function initial(
  event: CalendarEvent | null,
  range: Range | null,
  calendars: Calendar[],
  template: CalendarEvent | null = null,
): Draft {
  if (event) {
    const from = new Date(event.starts_at);
    const to = new Date(event.ends_at);
    if (event.all_day) {
      // La borne de fin est exclusive en base ; l'utilisateur pense en dernier
      // jour inclus. On retire un jour à l'affichage, on le remet à
      // l'enregistrement.
      const last = new Date(to);
      last.setDate(last.getDate() - 1);
      return {
        calendarId: event.calendar_id,
        title: event.title,
        location: event.location,
        description: event.description,
        allDay: true,
        date: dateValue(from),
        endDate: dateValue(last),
        startTime: "09:00",
        endTime: "10:00",
      };
    }
    return {
      calendarId: event.calendar_id,
      title: event.title,
      location: event.location,
      description: event.description,
      allDay: false,
      date: dateValue(from),
      endDate: dateValue(from),
      startTime: timeValue(from),
      endTime: timeValue(to),
    };
  }

  // Une duplication reprend le contenu, jamais l'identité : le nouvel
  // événement est un événement neuf, que la date proposée invite à déplacer.
  const copy = template
    ? {
        calendarId: template.calendar_id,
        title: `${template.title} (copie)`,
        location: template.location,
        description: template.description,
      }
    : null;

  // Les bornes tracées à la souris arrivent telles quelles : c'est tout
  // l'intérêt du geste, avoir déjà dit quand avant d'ouvrir le formulaire.
  const from = range?.from ?? new Date();
  const to = range?.to ?? new Date(from.getTime() + 3_600_000);

  if (range?.allDay) {
    // La borne de fin est exclusive ; l'utilisateur pense en dernier jour
    // inclus. On retire un jour à l'affichage, on le remet à l'enregistrement.
    const last = new Date(to);
    last.setDate(last.getDate() - 1);
    return {
      calendarId: copy?.calendarId ?? calendars[0]?.id ?? "",
      title: copy?.title ?? "",
      location: copy?.location ?? "",
      description: copy?.description ?? "",
      allDay: true,
      date: dateValue(from),
      endDate: dateValue(last),
      startTime: "09:00",
      endTime: "10:00",
    };
  }

  return {
    calendarId: copy?.calendarId ?? calendars[0]?.id ?? "",
    title: copy?.title ?? "",
    location: copy?.location ?? "",
    description: copy?.description ?? "",
    allDay: false,
    date: dateValue(from),
    endDate: dateValue(from),
    startTime: timeValue(from),
    endTime: timeValue(to),
  };
}

function bounds(draft: Draft): { start: string; end: string } {
  if (draft.allDay) {
    const last = new Date(`${draft.endDate}T00:00:00`);
    last.setDate(last.getDate() + 1);
    return { start: draft.date, end: dateValue(last) };
  }
  return {
    start: new Date(`${draft.date}T${draft.startTime}:00`).toISOString(),
    end: new Date(`${draft.date}T${draft.endTime}:00`).toISOString(),
  };
}
