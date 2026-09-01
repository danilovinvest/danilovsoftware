"use client";

import { useId, useState } from "react";
import { fr } from "date-fns/locale";
import { CalendarIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
            className={cn(
              "h-8 w-full justify-start px-2.5 font-normal",
              !selected && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="opacity-60" />
            {selected
              ? `${longDate.format(selected)} à ${timeInputValue(selected)}`
              : placeholder}
            {selected && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Retirer l'échéance"
                className="hover:text-foreground text-muted-foreground ml-auto"
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
