"use client";

import {
  CalendarIcon,
  MapPinIcon,
  RepeatIcon,
  UserIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { calendarById } from "../lib/events";
import {
  CALENDAR_STYLE,
  RESPONSE,
  describeRecurrence,
  formatDayLong,
  formatDuration,
  formatRange,
} from "../lib/labels";
import type { Occurrence } from "../lib/types";

/**
 * La fiche d'un événement.
 *
 * Elle montre ce que l'API renvoie et rien de plus : organisateur, invités avec
 * leur réponse, lieu, lien de visioconférence, règle de récurrence. Les
 * identifiants sont affichés en pied — c'est ce qui permet de retrouver
 * l'événement dans Google quand quelque chose cloche.
 */
export function EventDialog({
  occurrence,
  onClose,
}: {
  occurrence: Occurrence | null;
  onClose: () => void;
}) {
  const event = occurrence?.event;
  const calendar = event ? calendarById(event.calendarId) : undefined;
  const style = calendar ? CALENDAR_STYLE[calendar.colorKey] : null;
  const recurrence = describeRecurrence(event?.recurrence);

  return (
    <Dialog open={occurrence !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {occurrence && event && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-start gap-2 text-base">
                <span
                  className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", style?.dot)}
                />
                <span>{event.summary}</span>
              </DialogTitle>
              <DialogDescription className="pl-4.5">
                {formatDayLong(occurrence.start)} ·{" "}
                {formatRange(occurrence.start, occurrence.end, occurrence.allDay)}
                {!occurrence.allDay && (
                  <> · {formatDuration(occurrence.start, occurrence.end)}</>
                )}
                {event.status === "tentative" && (
                  <span className="text-warning"> · à confirmer</span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 text-sm">
              {recurrence && (
                <Row icon={RepeatIcon}>
                  {recurrence}
                  <span className="text-muted-foreground/70 ml-1.5 font-mono text-[11px]">
                    {event.recurrence?.[0]}
                  </span>
                </Row>
              )}

              {event.location && <Row icon={MapPinIcon}>{event.location}</Row>}

              {event.hangoutLink && (
                <Row icon={VideoIcon}>
                  <a
                    href={event.hangoutLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-info hover:underline"
                  >
                    Rejoindre avec Google Meet
                  </a>
                </Row>
              )}

              <Row icon={CalendarIcon}>
                {calendar?.summary}
                {event.crmCustomer && (
                  <>
                    <span className="text-muted-foreground"> · fiche </span>
                    <span className="font-medium">{event.crmCustomer}</span>
                  </>
                )}
              </Row>

              <Row icon={UserIcon}>
                <span className="text-muted-foreground">Organisé par </span>
                {event.organizer.displayName}
              </Row>

              {event.description && (
                <p className="text-muted-foreground border-t pt-3 text-xs leading-relaxed">
                  {event.description}
                </p>
              )}

              {event.attendees && event.attendees.length > 0 && (
                <div className="border-t pt-3">
                  <Row icon={UsersIcon}>
                    <span className="text-muted-foreground">
                      {event.attendees.length} participant
                      {event.attendees.length > 1 ? "s" : ""}
                    </span>
                  </Row>
                  <ul className="mt-2 flex flex-col gap-1.5 pl-6">
                    {event.attendees.map((attendee) => {
                      const response = RESPONSE[attendee.responseStatus];
                      return (
                        <li
                          key={attendee.displayName}
                          className="flex items-baseline justify-between gap-3"
                        >
                          <span className="min-w-0">
                            <span className="truncate text-xs">
                              {attendee.displayName}
                            </span>
                            {attendee.email && (
                              <span className="text-muted-foreground/70 block truncate text-[11px]">
                                {attendee.email}
                              </span>
                            )}
                          </span>
                          <span className={cn("shrink-0 text-[11px]", response.tone)}>
                            {response.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <p className="text-muted-foreground/60 border-t pt-3 font-mono text-[10px] break-all">
                {event.id} · calendarId {event.calendarId}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon: Icon,
  children,
}: {
  icon: typeof CalendarIcon;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-start gap-2 text-xs">
      <Icon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
