"use client";

import { CheckIcon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDayShort, formatTime, paletteAt } from "../lib/labels";
import type { CalendarListEntry } from "../lib/types";

type Entry = CalendarListEntry & { hidden: boolean; count: number; index: number };

/**
 * La colonne des agendas, dans l'esprit de `calendarList` : un abonnement par
 * ligne, une couleur, et une case pour le masquer. Masquer un agenda ne le
 * supprime pas — le compteur reste, ce qui évite de croire que les événements
 * ont disparu.
 *
 * Le masquage est **local et éphémère**, à ne pas confondre avec le décochage
 * de l'écran de réglages : ici on cache une couleur le temps de lire la grille,
 * là-bas on cesse de recopier un agenda.
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
  syncedAt: Date | null;
}) {
  return (
    <aside className="flex w-full flex-col gap-4 lg:w-60">
      <div className="bg-card rounded-xl border p-3">
        {syncedAt ? (
          <>
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <RefreshCwIcon className="text-success size-3.5" />
              Synchronisé
            </p>
            <p className="text-muted-foreground/70 mt-1 text-[11px]">
              {loaded} événement{loaded > 1 ? "s" : ""} chargé
              {loaded > 1 ? "s" : ""} · dernière copie {describeSync(syncedAt)}
            </p>
          </>
        ) : (
          <>
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <TriangleAlertIcon className="text-warning size-3.5" />
              Jamais synchronisé
            </p>
            <p className="text-muted-foreground/70 mt-1 text-[11px]">
              Raccordez le compte Google de l&apos;entreprise depuis
              Réglages → Agenda.
            </p>
          </>
        )}
      </div>

      {calendars.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground px-1 text-[11px] font-medium tracking-wide uppercase">
            Agendas
          </p>
          {calendars.map((calendar) => {
            const style = paletteAt(calendar.index);
            return (
              <button
                key={calendar.id}
                type="button"
                onClick={() => onToggle(calendar.id)}
                aria-pressed={!calendar.hidden}
                title={calendar.description || calendar.id}
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
      )}

      <p className="text-muted-foreground/70 px-1 text-[11px] leading-relaxed">
        Le CRM lit l&apos;agenda Google, il n&apos;y écrit jamais : créer ou
        déplacer un rendez-vous se fait dans Google Agenda, et la copie suit
        quelques minutes plus tard.
      </p>
    </aside>
  );
}

/** « à 14:32 » le jour même, « le 28 août » au-delà — une heure seule, la
 * veille, se lit comme si elle était d'aujourd'hui. */
function describeSync(date: Date): string {
  const sameDay = new Date().toDateString() === date.toDateString();
  return sameDay ? `à ${formatTime(date)}` : `le ${formatDayShort(date)}`;
}
