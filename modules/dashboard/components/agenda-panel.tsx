"use client";

import Link from "next/link";
import { CalendarDaysIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EVENT_KIND,
  EVENT_KIND_TONE,
  formatRange,
  type CalendarEvent,
} from "@/modules/calendar";
import { plural } from "@/shared/lib/format";
import { Panel, RowShell } from "@/shared/ui/panel";
import type { Live } from "../hooks/use-live";
import { isPast, type AgendaDays } from "../lib/today";
import { PanelEmpty, PanelLink, PanelMore, PanelState } from "./parts";

const MAX_TODAY = 6;
const MAX_TOMORROW = 3;

/**
 * L'agenda du jour, et le début de celui de demain.
 *
 * C'est l'agenda de l'équipe, pas le mien seul : savoir qu'un collègue est sur
 * un chantier ce matin répond à « qui puis-je appeler », et chaque ligne dit
 * pour qui elle est.
 */
export function AgendaPanel({
  live,
  now,
}: {
  live: Live<AgendaDays<CalendarEvent>>;
  now: Date;
}) {
  const days = live.data;

  return (
    <Panel
      title="Agenda"
      description={
        days
          ? `${plural(days.today.length, "rendez-vous", "rendez-vous")} aujourd'hui · ${days.tomorrow.length} demain`
          : "Aujourd'hui et demain"
      }
      icon={CalendarDaysIcon}
      tone="info"
      action={<PanelLink href="/calendar">Agenda</PanelLink>}
    >
      <PanelState live={live}>
        {(data) => (
          <>
            {data.today.length === 0 ? (
              <PanelEmpty>Rien de prévu aujourd&apos;hui.</PanelEmpty>
            ) : (
              <Day events={data.today} max={MAX_TODAY} now={now} />
            )}
            {data.tomorrow.length > 0 && (
              <>
                <p className="text-muted-foreground bg-muted/40 border-y px-4 py-1.5 text-[11px] font-medium">
                  Demain
                </p>
                <Day events={data.tomorrow} max={MAX_TOMORROW} now={now} />
              </>
            )}
          </>
        )}
      </PanelState>
    </Panel>
  );
}

function Day({ events, max, now }: { events: CalendarEvent[]; max: number; now: Date }) {
  return (
    <div className="divide-y">
      {events.slice(0, max).map((event) => (
        <EventRow key={event.id} event={event} past={isPast(event, now)} />
      ))}
      {events.length > max && (
        <PanelMore href="/calendar">et {plural(events.length - max, "autre")} — voir l&apos;agenda</PanelMore>
      )}
    </div>
  );
}

function EventRow({ event, past }: { event: CalendarEvent; past: boolean }) {
  const about = [event.customer_name, event.location, event.assignee_name].filter(Boolean).join(" · ");
  return (
    <RowShell className={cn("p-0", past && "opacity-55")}>
      <Link href="/calendar" className="flex min-w-0 flex-1 items-start gap-3 px-4 py-2.5">
        <span className="text-muted-foreground w-[5.5rem] shrink-0 pt-px text-[11px] tabular-nums">
          {formatRange(new Date(event.starts_at), new Date(event.ends_at), event.all_day)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{event.title || "Sans titre"}</span>
          {about && <span className="text-muted-foreground block truncate text-[11px]">{about}</span>}
        </span>
        <span
          className={cn(
            "hidden shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:inline-block",
            EVENT_KIND_TONE[event.kind],
          )}
        >
          {EVENT_KIND[event.kind].label}
        </span>
      </Link>
    </RowShell>
  );
}
