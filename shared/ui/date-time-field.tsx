"use client";

import { useId, useState } from "react";
import { fr } from "date-fns/locale";
import { CalendarIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Choix d'une date et d'une heure.
 *
 * Remplace <input type="datetime-local">, dont l'apparence est imposée par le
 * navigateur et dont le format d'affichage suit la locale du système plutôt
 * que celle de l'application. Ici : calendrier en français, semaine commençant
 * le lundi, heure saisie à part.
 *
 * La valeur circule en ISO 8601 ; les conversions vers l'heure locale et
 * retour vivent uniquement dans ce composant.
 */

const RACCOURCIS: Array<{ label: string; days: number; hour: number }> = [
  { label: "Aujourd'hui", days: 0, hour: 17 },
  { label: "Demain", days: 1, hour: 9 },
  { label: "Dans 3 jours", days: 3, hour: 9 },
  { label: "Semaine prochaine", days: 7, hour: 9 },
];

function atTime(date: Date, hours: number, minutes: number): Date {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function timeInputValue(date: Date | null): string {
  if (!date) return "09:00";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const longDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/*
La forme courte, celle qui tient dans un champ.

« vendredi 4 septembre à 09:00 » fait deux cent dix pixels ; la moitié d'une
boîte de dialogue en fait deux cent cinquante, moins l'icône, le remplissage et
la croix. Le libellé débordait. « ven. 4 sept. · 9h » dit la même chose en
moitié moins, et la forme longue reste dans l'infobulle.

Le jour de la semaine est gardé, abrégé : sur une échéance, « ven. » situe
immédiatement, là où « 4 sept. » demande de compter.
*/
const shortDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** L'heure à la française — « 9h », « 14h30 » — comme dans le calendrier. */
function frenchHour(date: Date): string {
  const minutes = date.getMinutes();
  return minutes === 0
    ? `${date.getHours()}h`
    : `${date.getHours()}h${String(minutes).padStart(2, "0")}`;
}

const longDateYear = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Valeur d'un `<input type="date">` : AAAA-MM-JJ, en heure locale. */
function dateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Choix d'une date seule, sans heure.
 *
 * Même calendrier que `DateTimeField` — français, semaine au lundi — mais une
 * valeur obligatoire et sans heure : un événement a toujours un jour, alors
 * qu'une tâche peut n'avoir aucune échéance. D'où l'absence de croix pour
 * effacer, qui ne mènerait qu'à un état impossible à enregistrer.
 *
 * La valeur circule en AAAA-MM-JJ, jamais en Date : c'est ce que Google attend
 * pour une journée entière, et cela évite qu'un fuseau ne décale le jour à la
 * traversée.
 */
export function DateField({
  label,
  value,
  onChange,
  hint,
  error,
  wrapperClassName,
}: {
  label?: string;
  /** AAAA-MM-JJ. */
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  const parsed = value ? new Date(`${value}T00:00:00`) : null;
  const selected = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  const thisYear = selected?.getFullYear() === new Date().getFullYear();

  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <Label htmlFor={id} className="text-muted-foreground text-xs font-medium">
          {label}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={error ? true : undefined}
            className={cn(
              "h-8 w-full justify-start px-2.5 font-normal",
              !selected && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="shrink-0 opacity-60" />
            <span className="min-w-0 flex-1 truncate text-left first-letter:uppercase">
              {selected
                ? (thisYear ? longDate : longDateYear).format(selected)
                : "Choisir une date"}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={fr}
            weekStartsOn={1}
            selected={selected ?? undefined}
            defaultMonth={selected ?? undefined}
            onSelect={(date) => {
              if (!date) return;
              onChange(dateInputValue(date));
              setOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export function DateTimeField({
  label,
  value,
  onChange,
  hint,
  error,
  wrapperClassName,
  placeholder = "Aucune échéance",
}: {
  label?: string;
  /** Date ISO, ou null. */
  value: string | null;
  onChange: (iso: string | null) => void;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  const parsed = value ? new Date(value) : null;
  const selected = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

  function commit(date: Date | undefined, time?: string) {
    if (!date) {
      onChange(null);
      return;
    }
    const [hours, minutes] = (time ?? timeInputValue(selected)).split(":").map(Number);
    onChange(atTime(date, hours || 0, minutes || 0).toISOString());
  }

  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <Label htmlFor={id} className="text-muted-foreground text-xs font-medium">
          {label}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={error ? true : undefined}
            title={
              selected ? `${longDate.format(selected)} à ${timeInputValue(selected)}` : undefined
            }
            className={cn(
              "h-8 w-full justify-start px-2.5 font-normal",
              !selected && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="shrink-0 opacity-60" />
            <span className="min-w-0 flex-1 truncate text-left">
              {selected
                ? `${shortDate.format(selected)} · ${frenchHour(selected)}`
                : placeholder}
            </span>
            {selected && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Retirer l'échéance"
                className="hover:text-foreground text-muted-foreground shrink-0"
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(null);
                }}
              >
                <XIcon className="size-3.5" />
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-wrap gap-1 border-b p-2">
            {RACCOURCIS.map((raccourci) => (
              <Button
                key={raccourci.label}
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => {
                  const date = new Date();
                  date.setDate(date.getDate() + raccourci.days);
                  onChange(atTime(date, raccourci.hour, 0).toISOString());
                  setOpen(false);
                }}
              >
                {raccourci.label}
              </Button>
            ))}
          </div>

          <Calendar
            mode="single"
            locale={fr}
            weekStartsOn={1}
            selected={selected ?? undefined}
            defaultMonth={selected ?? undefined}
            onSelect={(date) => commit(date)}
            autoFocus
          />

          <div className="flex items-center gap-2 border-t p-2">
            <Label htmlFor={`${id}-time`} className="text-muted-foreground text-xs">
              Heure
            </Label>
            <Input
              id={`${id}-time`}
              type="time"
              className="h-7 w-28"
              value={timeInputValue(selected)}
              onChange={(event) => {
                // Sans date choisie, régler l'heure seule n'a pas de sens :
                // on la pose sur aujourd'hui.
                commit(selected ?? new Date(), event.target.value);
              }}
            />
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="ml-auto"
              onClick={() => setOpen(false)}
            >
              Fermer
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

/* --- Heure ------------------------------------------------------------------
 *
 * `<input type="time">` a deux défauts pour un agenda : son apparence est celle
 * du navigateur — horloge grise comprise — et il faut taper l'heure au clavier
 * alors qu'un rendez-vous tombe presque toujours sur un quart d'heure. Une
 * liste de créneaux se choisit d'un clic, et affiche la durée en face de chaque
 * heure de fin, ce qu'aucun champ natif ne sait faire.
 */

const STEP_MINUTES = 15;

function minutesOf(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function clockOf(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** « 30 min », « 1 h », « 1 h 30 » — la durée telle qu'on la dit. */
function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest}`;
}

export function TimeField({
  label,
  value,
  onChange,
  /** Heure de début : les créneaux antérieurs sont écartés et la durée
   * s'affiche en face de chacun. Absent, la liste couvre la journée. */
  after,
  wrapperClassName,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  after?: string;
  wrapperClassName?: string;
}) {
  const id = useId();
  const floor = after !== undefined ? minutesOf(after) : -1;

  const slots: Array<{ value: string; label: string }> = [];
  for (let m = 0; m < 24 * 60; m += STEP_MINUTES) {
    if (m <= floor) continue;
    const clock = clockOf(m);
    slots.push({
      value: clock,
      label: after !== undefined ? `${clock} · ${durationLabel(m - floor)}` : clock,
    });
  }

  // Une heure qui ne tombe pas sur un quart d'heure — un événement importé de
  // Google, ou saisi ailleurs — doit rester sélectionnable, sinon l'ouvrir
  // pour changer le titre la déplacerait.
  if (value && !slots.some((slot) => slot.value === value)) {
    const extra =
      after !== undefined && minutesOf(value) > floor
        ? `${value} · ${durationLabel(minutesOf(value) - floor)}`
        : value;
    slots.unshift({ value, label: extra });
  }

  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <Label htmlFor={id} className="text-muted-foreground text-xs font-medium">
          {label}
        </Label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-8 w-full tabular-nums">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {slots.map((slot) => (
            <SelectItem key={slot.value} value={slot.value} className="tabular-nums">
              {slot.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
