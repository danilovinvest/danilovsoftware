"use client";

import { CheckIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "../lib/labels";
import { CALENDAR_STYLE } from "../lib/labels";
import { ACCOUNT_EMAIL } from "../lib/seed";
import type { CalendarListEntry } from "../lib/types";

type Entry = CalendarListEntry & { hidden: boolean; count: number };

/**
 * La colonne des agendas, dans l'esprit de `calendarList` : un abonnement par
 * ligne, une couleur, et une case pour le masquer. Masquer un agenda ne le
 * supprime pas — le compteur reste, ce qui évite de croire que les événements
 * ont disparu.
 */
export function CalendarSidebar({
  calendars,
  onToggle,
  loaded,
  syncedAt,
}: {
  calendars: Entry[];
  onToggle: (id: string) => void;
  loaded: number;
  syncedAt: Date;
}) {
  return (
    <aside className="flex w-full flex-col gap-4 lg:w-60">
      <div className="bg-card rounded-xl border p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium">
          <RefreshCwIcon className="text-success size-3.5" />
          Synchronisé
        </p>
        <p className="text-muted-foreground mt-1 truncate text-[11px]">
          {ACCOUNT_EMAIL}
        </p>
        <p className="text-muted-foreground/70 mt-0.5 text-[11px]">
          {loaded} événements chargés · dernière synchro à {formatTime(syncedAt)}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground px-1 text-[11px] font-medium tracking-wide uppercase">
          Mes agendas
        </p>
        {calendars.map((calendar) => {
          const style = CALENDAR_STYLE[calendar.colorKey];
          return (
            <button
              key={calendar.id}
              type="button"
              onClick={() => onToggle(calendar.id)}
              aria-pressed={!calendar.hidden}
              title={calendar.description}
              className="hover:bg-accent flex items-center gap-2 rounded-[4px] px-1.5 py-1.5 text-left transition-colors"
            >
              <span
                className={cn(
                  "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border",
                  calendar.hidden
                    ? "border-input"
                    : cn("border-transparent", style.solid),
                )}
              >
                {!calendar.hidden && <CheckIcon className="size-2.5" strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-xs",
                  calendar.hidden && "text-muted-foreground line-through",
                )}
              >
                {calendar.summary}
              </span>
              <span className="text-muted-foreground/70 shrink-0 text-[11px] tabular-nums">
                {calendar.count}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-muted-foreground/70 px-1 text-[11px] leading-relaxed">
        Les agendas en lecture seule — absences de l&apos;équipe — sont partagés
        par leur propriétaire. Les modifier se fait dans Google Agenda.
      </p>
    </aside>
  );
}
