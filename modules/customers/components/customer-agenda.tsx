"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlusIcon, ClockIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import {
  EventForm,
  EVENT_KIND,
  EVENT_KIND_TONE,
  formatDayShort,
  formatRange,
  listCalendars,
  listCustomerEvents,
  type Calendar,
  type CalendarEvent,
} from "@/modules/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorNotice } from "@/shared/ui/feedback";
import { Bar } from "@/shared/ui/loading";
import { errorMessage } from "@/shared/api/errors";
import { cn } from "@/lib/utils";

/**
 * Ce qui est prévu avec ce client.
 *
 * L'onglet « Échanges » ne savait dire que ce qui **a eu lieu** : on y notait un
 * appel après l'avoir passé. Ce qu'il ne savait pas dire, c'est ce qui **est
 * prévu** — et c'est pourtant la question qu'on se pose en ouvrant une fiche
 * un lundi matin.
 *
 * Les deux sont volontairement distincts et le restent : une interaction est
 * une trace, un événement d'agenda est un engagement. Confondre les deux ferait
 * apparaître dans l'historique un rendez-vous qui n'a pas encore eu lieu, et
 * pourrait ne jamais avoir lieu.
 *
 * Le formulaire est celui de l'agenda, avec la fiche et la catégorie déjà
 * posées : en écrire un second aurait donné deux écrans à tenir pour un même
 * objet.
 */
export function CustomerAgenda({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const canWrite = usePermission("customers:write");
  /**
   * Les événements **et l'instant où on les a lus**.
   *
   * « À venir » se tranche sur une horloge, et lire `Date.now()` au rendu
   * donnerait une réponse différente à chaque repeinture. L'instant est donc
   * figé au chargement, comme `generated_at` l'est côté chantiers.
   */
  const [charge, setCharge] = useState<{
    items: CalendarEvent[];
    a: number;
  } | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const charger = useCallback(() => {
    listCustomerEvents(customerId, 20)
      .then((page) => setCharge({ items: page.items, a: Date.now() }))
      .catch((cause) => {
        setError(errorMessage(cause));
        setCharge({ items: [], a: Date.now() });
      });
  }, [customerId]);

  useEffect(charger, [charger]);

  // Les agendas ne sont chargés qu'une fois : ils changent rarement, et le
  // formulaire en a besoin dès son ouverture pour proposer où poser
  // l'événement.
  useEffect(() => {
    const controller = new AbortController();
    listCalendars(controller.signal)
      .then((page) => setCalendars(page.items))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const events = charge?.items ?? null;
  const maintenant = charge?.a ?? 0;
  const aVenir = (events ?? []).filter(
    (event) => new Date(event.starts_at).getTime() >= maintenant,
  );
  const passes = (events ?? []).filter(
    (event) => new Date(event.starts_at).getTime() < maintenant,
  );

  return (
    <>
      <Card className="gap-0 py-0">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">À l&apos;agenda</p>
            <p className="text-muted-foreground text-xs">
              {events === null
                ? "Chargement…"
                : aVenir.length === 0
                  ? "Rien de prévu avec ce client."
                  : `${aVenir.length} à venir`}
            </p>
          </div>
          {canWrite && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <CalendarPlusIcon />
              Planifier un échange
            </Button>
          )}
        </div>

        {error && (
          <div className="px-5 pb-3">
            <ErrorNotice message={error} />
          </div>
        )}

        {events === null ? (
          <div className="flex flex-col gap-2 border-t px-5 py-3">
            <Bar hue="crimson" className="h-4 w-2/3" />
            <Bar hue="crimson" className="h-4 w-1/2" />
          </div>
        ) : (
          events.length > 0 && (
            <ol className="divide-y border-t">
              {[...aVenir, ...passes].map((event) => (
                <Ligne
                  key={event.id}
                  event={event}
                  passe={new Date(event.starts_at).getTime() < maintenant}
                  onOpen={
                    canWrite
                      ? () => {
                          setEditing(event);
                          setOpen(true);
                        }
                      : undefined
                  }
                />
              ))}
            </ol>
          )
        )}
      </Card>

      <EventForm
        open={open}
        onClose={() => setOpen(false)}
        onSaved={charger}
        calendars={calendars}
        event={editing}
        preset={
          editing
            ? null
            : {
                kind: "echange",
                customerId,
                customerName,
              }
        }
      />
    </>
  );
}

function Ligne({
  event,
  passe,
  onOpen,
}: {
  event: CalendarEvent;
  /** Un événement passé s'affiche en retrait : il est là pour mémoire. */
  passe: boolean;
  onOpen?: () => void;
}) {
  const debut = new Date(event.starts_at);
  const fin = new Date(event.ends_at);

  const contenu = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
              EVENT_KIND_TONE[event.kind],
            )}
          >
            {EVENT_KIND[event.kind]?.label ?? event.kind}
          </span>
          <span className="truncate text-sm font-medium">{event.title}</span>
        </span>
        {event.description && (
          <span className="text-muted-foreground line-clamp-2 text-xs whitespace-pre-line">
            {event.description}
          </span>
        )}
        {event.location && (
          <span className="text-muted-foreground/70 truncate text-[11px]">
            {event.location}
          </span>
        )}
      </span>
      <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
        <ClockIcon className="size-3.5" />
        {formatDayShort(debut)} ·{" "}
        {formatRange(debut, fin, event.all_day)}
      </span>
    </>
  );

  return (
    <li className={cn(passe && "opacity-60")}>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="hover:bg-accent/50 flex w-full items-start justify-between gap-4 px-5 py-3 text-left"
        >
          {contenu}
        </button>
      ) : (
        <div className="flex items-start justify-between gap-4 px-5 py-3">
          {contenu}
        </div>
      )}
    </li>
  );
}
