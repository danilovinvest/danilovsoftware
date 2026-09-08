"use client";

import Link from "next/link";
import {
  ArrowUpRightIcon,
  CalendarIcon,
  DownloadIcon,
  MapPinIcon,
  CopyIcon,
  PencilIcon,
  UserIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  EVENT_KIND,
  EVENT_KIND_TONE,
  RESPONSE,
  formatDayLong,
  formatDuration,
  formatRange,
  personName,
} from "../lib/labels";
import type { Occurrence } from "../lib/types";

/**
 * La fiche d'un événement.
 *
 * Organisateur et invités n'apparaissent que sur ce qui vient d'un import :
 * ils ont été recopiés depuis Google et restent tels quels. Un événement né
 * dans le CRM n'en a pas — poser des invités supposerait de leur envoyer une
 * invitation, ce que le CRM ne fait pas.
 */
export function EventDialog({
  occurrence,
  onClose,
  onEdit,
  onDuplicate,
}: {
  occurrence: Occurrence | null;
  onClose: () => void;
  /** Absents quand le compte n'a pas le droit d'écrire dans l'agenda. */
  onEdit?: (occurrence: Occurrence) => void;
  onDuplicate?: (occurrence: Occurrence) => void;
}) {
  const event = occurrence?.event;
  const style = occurrence?.style ?? null;

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
                <span className="min-w-0">
                  <span>{event.title}</span>
                  {/* La catégorie dit *ce que c'est*, la pastille de couleur dit
                      *où ça vit*. Deux questions, deux marques. */}
                  <span
                    className={cn(
                      "ml-2 rounded-md px-1.5 py-0.5 align-middle text-[11px] font-medium",
                      EVENT_KIND_TONE[event.kind],
                    )}
                  >
                    {EVENT_KIND[event.kind]?.label ?? event.kind}
                  </span>
                </span>
              </DialogTitle>
              <DialogDescription className="pl-4.5">
                {formatDayLong(occurrence.start)} ·{" "}
                {formatRange(occurrence.start, occurrence.end, occurrence.allDay)}
                {!occurrence.allDay && (
                  <> · {formatDuration(occurrence.start, occurrence.end)}</>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 text-sm">
              {/* Le lien vers la fiche : c'est tout l'intérêt du rattachement.
                  Un rendez-vous nommé « Mme THEUWISSEN » n'ouvrait rien. */}
              {event.customer_id && (
                <Row icon={UserIcon}>
                  <Link
                    href={`/customers/${event.customer_id}`}
                    className="text-info inline-flex items-center gap-1 hover:underline"
                  >
                    {event.customer_name || "Voir la fiche"}
                    <ArrowUpRightIcon className="size-3" />
                  </Link>
                </Row>
              )}

              {event.location && <Row icon={MapPinIcon}>{event.location}</Row>}

              {event.meet_url && (
                <Row icon={VideoIcon}>
                  <a
                    href={event.meet_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-info hover:underline"
                  >
                    Rejoindre la visioconférence
                  </a>
                </Row>
              )}

              <Row icon={CalendarIcon}>
                {occurrence.calendarName}
                {event.imported && (
                  <span className="text-muted-foreground/70 ml-1.5 inline-flex items-center gap-1 text-[11px]">
                    <DownloadIcon className="size-3" />
                    importé de Google
                  </span>
                )}
              </Row>

              {event.organizer && (
                <Row icon={UserIcon}>
                  <span className="text-muted-foreground">Organisé par </span>
                  {event.organizer}
                </Row>
              )}

              {event.description && (
                <p className="text-muted-foreground border-t pt-3 text-xs leading-relaxed">
                  {event.description}
                </p>
              )}

              {event.attendees.length > 0 && (
                <div className="border-t pt-3">
                  <Row icon={UsersIcon}>
                    <span className="text-muted-foreground">
                      {event.attendees.length} participant
                      {event.attendees.length > 1 ? "s" : ""} · recopiés de
                      Google, non modifiables ici
                    </span>
                  </Row>
                  <ul className="mt-2 flex flex-col gap-1.5 pl-6">
                    {event.attendees.map((attendee) => {
                      const response = RESPONSE[attendee.responseStatus];
                      return (
                        <li
                          key={attendee.email ?? attendee.displayName}
                          className="flex items-baseline justify-between gap-3"
                        >
                          <span className="min-w-0">
                            <span className="truncate text-xs">
                              {personName(attendee)}
                            </span>
                            {attendee.email && attendee.displayName && (
                              <span className="text-muted-foreground/70 block truncate text-[11px]">
                                {attendee.email}
                              </span>
                            )}
                          </span>
                          {response && (
                            <span className={cn("shrink-0 text-[11px]", response.tone)}>
                              {response.label}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {onEdit && (
                <div className="flex justify-end gap-2 border-t pt-3">
                  {onDuplicate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      onClick={() => onDuplicate(occurrence)}
                    >
                      <CopyIcon className="size-3.5" />
                      Dupliquer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => onEdit(occurrence)}
                  >
                    <PencilIcon className="size-3.5" />
                    Modifier
                  </Button>
                </div>
              )}
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
