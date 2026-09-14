"use client";

import { cn } from "@/lib/utils";
import { TONE_SOFT } from "@/shared/ui/panel";
import { WORKSITE_STATUS } from "../lib/labels";
import type { ReadWorksite } from "../lib/types";

/**
 * Le calendrier des démarrages.
 *
 * C'était un diagramme de Gantt, avec une barre par chantier. Il supposait une
 * **date de fin prévue**, et aucune des cent dix affaires signées n'en porte :
 * les barres étaient toutes inventées. Ce qui existe vraiment, c'est la date de
 * démarrage — cent affaires sur deux cent soixante-sept l'ont.
 *
 * Douze semaines, la semaine en cours mise en évidence : assez de passé pour
 * voir ce qui a démarré, assez d'avenir pour voir ce qui arrive. Les chantiers
 * sans date n'y figurent pas — c'est ce qui les distingue, et le tableau les
 * montre dans « À planifier ».
 */
const WEEKS_BEFORE = 4;
const WEEKS_AFTER = 8;
const DAY = 86_400_000;

function startOfWeek(time: number): number {
  const date = new Date(time);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return day.getTime() - ((day.getDay() + 6) % 7) * DAY;
}

const weekLabel = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });

export function WorksitePlanning({
  reads,
  now,
  onSelect,
}: {
  reads: ReadWorksite[];
  now: number;
  onSelect: (id: string) => void;
}) {
  const current = startOfWeek(now);
  const origin = current - WEEKS_BEFORE * 7 * DAY;
  const weeks = Array.from({ length: WEEKS_BEFORE + WEEKS_AFTER }, (_, index) => ({
    start: origin + index * 7 * DAY,
    items: [] as ReadWorksite[],
  }));

  let outside = 0;
  for (const read of reads) {
    if (!read.worksite.started_at) continue;
    const week = startOfWeek(new Date(read.worksite.started_at).getTime());
    const slot = weeks.find((w) => w.start === week);
    if (slot) slot.items.push(read);
    else outside += 1;
  }

  if (weeks.every((week) => week.items.length === 0)) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-xs">
        Aucun démarrage sur les douze semaines affichées.
        {outside > 0 && ` ${outside} chantiers démarrent en dehors de cette fenêtre.`}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full min-w-0 overflow-x-auto">
        <div className="flex min-w-200 gap-2">
          {weeks.map((week) => {
            const isCurrent = week.start === current;
            return (
              <div key={week.start} className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div
                  className={cn(
                    "rounded-md px-1.5 py-1 text-center text-[11px]",
                    isCurrent
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground/70",
                  )}
                >
                  {weekLabel.format(new Date(week.start))}
                </div>

                <div className="flex flex-col gap-1">
                  {week.items.map((read) => (
                    <button
                      key={read.worksite.id}
                      type="button"
                      onClick={() => onSelect(read.worksite.id)}
                      title={`${read.worksite.customer_name} — ${read.worksite.label}`}
                      className={cn(
                        "truncate rounded-md px-1.5 py-1 text-left text-[11px] font-semibold transition-opacity hover:opacity-80",
                        TONE_SOFT[WORKSITE_STATUS[read.status].tone],
                      )}
                    >
                      {read.worksite.customer_name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {outside > 0 && (
        <p className="text-muted-foreground/60 text-[11px]">
          {outside} chantier{outside > 1 ? "s démarrent" : " démarre"} en dehors de
          cette fenêtre de douze semaines.
        </p>
      )}
    </div>
  );
}
