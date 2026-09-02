"use client";

import { cn } from "@/lib/utils";
import { eurosShort } from "@/shared/lib/format";
import { TONE_FILL } from "@/shared/ui/panel";
import { WORKSITE_STATUS } from "../lib/labels";
import type { Worksite } from "../lib/types";

/**
 * Le planning des chantiers datés.
 *
 * Douze semaines, la semaine en cours au tiers de la largeur : assez de passé
 * pour voir ce qui déborde, assez d'avenir pour voir ce qui arrive. Les
 * chantiers sans date n'y figurent pas — c'est justement ce qui les distingue,
 * et le tableau les montre dans « À planifier ».
 */
const WEEKS_BEFORE = 4;
const WEEKS_AFTER = 8;
const DAY = 86_400_000;

function startOfWeek(date: Date): Date {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return new Date(day.getTime() - ((day.getDay() + 6) % 7) * DAY);
}

const weekLabel = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });

export function WorksitePlanning({
  worksites,
  now,
  onSelect,
}: {
  worksites: Worksite[];
  now: Date;
  onSelect: (worksite: Worksite) => void;
}) {
  const origin = new Date(startOfWeek(now).getTime() - WEEKS_BEFORE * 7 * DAY);
  const totalDays = (WEEKS_BEFORE + WEEKS_AFTER) * 7;
  const weeks = Array.from({ length: WEEKS_BEFORE + WEEKS_AFTER }, (_, index) => index);

  const offset = (value: string) =>
    (new Date(value).getTime() - origin.getTime()) / DAY;

  // Les chantiers entièrement hors fenêtre sont écartés : une ligne sans barre
  // n'apprend rien et repousse vers le bas ceux qui comptent.
  const dated = worksites
    .filter((worksite) => {
      if (worksite.starts_at === null || worksite.ends_at === null) return false;
      return offset(worksite.ends_at) > 0 && offset(worksite.starts_at) < totalDays;
    })
    .sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));

  const todayLeft = (offset(now.toISOString()) / totalDays) * 100;

  if (dated.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-xs">
        Aucun chantier daté sur la période.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[56rem]">
        {/* En-tête des semaines */}
        <div className="grid grid-cols-[14rem_1fr] border-b">
          <div />
          <div className="relative flex">
            {weeks.map((week) => (
              <div
                key={week}
                className="text-muted-foreground flex-1 border-l px-1 py-1 text-[10px]"
              >
                {weekLabel.format(new Date(origin.getTime() + week * 7 * DAY))}
              </div>
            ))}
          </div>
        </div>

        <div className="relative divide-y">
          {/* Le trait d'aujourd'hui traverse toutes les lignes. */}
          <div
            className="bg-danger pointer-events-none absolute inset-y-0 z-10 w-px"
            style={{ left: `calc(14rem + (100% - 14rem) * ${todayLeft / 100})` }}
            aria-hidden
          />

          {dated.map((worksite) => {
            const from = Math.max(0, offset(worksite.starts_at ?? ""));
            const to = Math.min(totalDays, offset(worksite.ends_at ?? ""));
            const entry = WORKSITE_STATUS[worksite.status];

            return (
              <div
                key={worksite.id}
                className="grid grid-cols-[14rem_1fr] items-center gap-2 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => onSelect(worksite)}
                  className="hover:text-foreground min-w-0 pr-2 text-left"
                >
                  <span className="block truncate text-xs font-medium">
                    {worksite.customer_name}
                  </span>
                  <span className="text-muted-foreground block truncate text-[11px]">
                    {worksite.city} · {eurosShort(worksite.amount_ht)}
                  </span>
                </button>

                <div className="relative h-6">
                  {weeks.map((week) => (
                    <div
                      key={week}
                      className="absolute inset-y-0 border-l"
                      style={{ left: `${(week / weeks.length) * 100}%` }}
                      aria-hidden
                    />
                  ))}
                  <button
                      type="button"
                      onClick={() => onSelect(worksite)}
                      title={`${worksite.label} — ${entry.label}`}
                      style={{
                        left: `${(from / totalDays) * 100}%`,
                        width: `${Math.max(((to - from) / totalDays) * 100, 1.5)}%`,
                      }}
                      className={cn(
                        "absolute inset-y-1 rounded-[3px] px-1.5 text-left text-[10px] leading-4 text-white",
                        TONE_FILL[entry.tone],
                        worksite.days_late > 0 && "ring-danger ring-1",
                      )}
                    >
                    <span className="block truncate">{worksite.label}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
