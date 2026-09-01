import { CalendarClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/ui/feedback";
import { AGENDA_KIND } from "../lib/labels";
import type { AgendaEvent } from "../lib/types";
import { Panel, TONE_SOFT } from "./ui";

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

/** « Aujourd'hui » et « demain » se lisent plus vite qu'une date. */
function dayLabel(date: Date, today: Date): string {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((start(date).getTime() - start(today).getTime()) / 86_400_000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  return dayFormat.format(date);
}

export function AgendaPanel({
  events,
  now,
}: {
  events: AgendaEvent[];
  /** L'instant de référence, figé au montage : le regroupement ne doit pas
      dépendre du moment où React redessine. */
  now: Date;
}) {
  const groups = new Map<string, AgendaEvent[]>();
  for (const event of events) {
    const key = dayLabel(new Date(event.at), now);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return (
    <Panel
      title="Prochaines échéances"
      description="Rendez-vous, rendus d'étude et interventions à venir"
      icon={CalendarClockIcon}
      tone="info"
      bodyClassName="divide-y"
    >
      {events.length === 0 ? (
        <EmptyState title="Rien de prévu" />
      ) : (
        [...groups.entries()].map(([day, items]) => (
          <div key={day} className="px-4 py-2.5">
            <p className="text-muted-foreground mb-1.5 text-[11px] font-medium tracking-wide uppercase">
              {day}
            </p>
            <ul className="flex flex-col gap-1.5">
              {items.map((event) => {
                const kind = AGENDA_KIND[event.kind];
                const Icon = kind.icon;
                return (
                  <li key={event.id} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[4px]",
                        TONE_SOFT[kind.tone],
                      )}
                      title={kind.label}
                    >
                      <Icon className="size-3" />
                    </span>
                    <span className="text-muted-foreground w-11 shrink-0 pt-0.5 text-xs tabular-nums">
                      {timeFormat.format(new Date(event.at))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {event.label}
                      </span>
                      <span className="text-muted-foreground block truncate text-[11px]">
                        {event.customer_name} · {event.owner_name}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </Panel>
  );
}
