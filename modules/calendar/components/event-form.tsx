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
import * as api from "../lib/api";
import type { CalendarListEntry, GoogleEvent } from "../lib/types";

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
  /** Jour pré-rempli à la création, quand on a cliqué une case du calendrier. */
  day,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  calendars: CalendarListEntry[];
  event?: GoogleEvent | null;
  day?: Date | null;
}) {
  // Le formulaire est remonté à chaque ouverture : la clé change avec la cible,
  // et l'état initial se calcule une fois, dans l'initialiseur du useState.
  const key = `${open}:${event?.id ?? "nouveau"}:${day?.toISOString() ?? ""}`;
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
            day={day ?? null}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type Draft = {
  calendarId: string;
  summary: string;
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
  day,
}: {
  onClose: () => void;
  onSaved: () => void;
  calendars: CalendarListEntry[];
  event: GoogleEvent | null;
  day: Date | null;
}) {
  // Seuls les agendas dont on est propriétaire ou rédacteur : Google refuserait
  // les autres, autant ne pas les proposer.
  const writable = calendars.filter(
    (calendar) => calendar.access_role === "owner" || calendar.access_role === "writer",
  );

  const [draft, setDraft] = useState<Draft>(() => initial(event, day, writable));
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
        summary: draft.summary,
        location: draft.location,
        description: draft.description,
        all_day: draft.allDay,
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
      await api.deleteEvent(event.id, event.calendarId);
      onSaved();
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  // Un événement peut vivre dans un agenda partagé en consultation — les jours
  // fériés, l'agenda d'un confrère. Google refuserait la modification ; le dire
  // ici évite un aller-retour et une erreur incompréhensible.
  const host = event ? calendars.find((c) => c.id === event.calendarId) : null;
  const locked = event !== null && !writable.some((c) => c.id === event.calendarId);

  if (writable.length === 0 || locked) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-base">Agenda en lecture seule</DialogTitle>
          <DialogDescription>
            {locked ? (
              <>
                Cet événement vit dans «&nbsp;{host?.summary ?? event?.calendarId}
                &nbsp;», un agenda partagé en consultation. Il se modifie chez
                celui qui le possède.
              </>
            ) : (
              <>
                Tous les agendas raccordés sont partagés en consultation. Pour
                écrire, il faut un agenda dont le compte Google est propriétaire.
              </>
            )}
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
          {event
            ? "La modification part chez Google : elle sera visible partout où l'agenda l'est, y compris sur les téléphones."
            : "Il sera créé dans Google Agenda, et visible par tous ceux qui partagent le compte."}
        </DialogDescription>
      </DialogHeader>

      {error && <ErrorNotice message={error} />}

      <div className="flex flex-col gap-3">
        <TextField
          label="Titre"
          required
          autoFocus
          value={draft.summary}
          onChange={(e) => set("summary", e.target.value)}
          placeholder="Visite de chantier — Villa Roquefort"
        />

        <SelectField
          label="Agenda"
          required
          // Figé en modification : déplacer un événement d'un agenda à un autre
          // n'est pas une mise à jour chez Google mais une opération à part
          // (`events.move`), et un PATCH qui changerait ce champ serait
          // silencieusement ignoré — l'écran mentirait sur ce qu'il a fait.
          disabled={event !== null}
          hint={event ? "Un événement ne change pas d'agenda depuis le CRM." : undefined}
          value={draft.calendarId}
          onValueChange={(value) => set("calendarId", value)}
          options={writable.map((calendar) => ({
            value: calendar.id,
            label: calendar.summary || calendar.id,
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

        {event && event.attendees && event.attendees.length > 0 && (
          <p className="text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 text-[11px]">
            {event.attendees.length} invité
            {event.attendees.length > 1 ? "s" : ""} sur cet événement. Ils sont
            conservés tels quels — la liste se modifie dans Google Agenda, où
            l&apos;on voit qui reçoit quelle notification.
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
          <Button onClick={save} disabled={pending || !draft.summary.trim()}>
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

function initial(
  event: GoogleEvent | null,
  day: Date | null,
  writable: CalendarListEntry[],
): Draft {
  const fallback = writable[0]?.id ?? "";

  if (event) {
    const allDay = event.start.date !== undefined;
    if (allDay) {
      const from = new Date(`${event.start.date}T00:00:00`);
      // Google borne une journée entière par le lendemain ; l'utilisateur
      // pense en dernier jour inclus. On retire un jour à l'affichage et on le
      // rajoute à l'enregistrement.
      const to = new Date(`${event.end.date}T00:00:00`);
      to.setDate(to.getDate() - 1);
      return {
        calendarId: event.calendarId,
        summary: event.summary ?? "",
        location: event.location ?? "",
        description: event.description ?? "",
        allDay: true,
        date: dateValue(from),
        endDate: dateValue(to),
        startTime: "09:00",
        endTime: "10:00",
      };
    }
    const from = new Date(event.start.dateTime ?? "");
    const to = new Date(event.end.dateTime ?? "");
    return {
      calendarId: event.calendarId,
      summary: event.summary ?? "",
      location: event.location ?? "",
      description: event.description ?? "",
      allDay: false,
      date: dateValue(from),
      endDate: dateValue(from),
      startTime: timeValue(from),
      endTime: timeValue(to),
    };
  }

  const base = day ?? new Date();
  // Une heure d'un créneau cliqué est déjà utile ; à défaut, la prochaine
  // heure ronde, qui est ce qu'on veut neuf fois sur dix.
  const rounded = day && day.getHours() !== 0 ? day.getHours() : new Date().getHours() + 1;
  return {
    calendarId: fallback,
    summary: "",
    location: "",
    description: "",
    allDay: false,
    date: dateValue(base),
    endDate: dateValue(base),
    startTime: `${pad(Math.min(rounded, 22))}:00`,
    endTime: `${pad(Math.min(rounded + 1, 23))}:00`,
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
