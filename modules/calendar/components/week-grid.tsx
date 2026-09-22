"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { addDays, isSameDay, startOfDay, startOfWeek } from "../lib/events";
import {
  DEFAULT_MINUTES,
  STEP_MINUTES,
  at,
  clamp,
  minutesOfDate,
  pointToSlot,
  ratioOfMinutes,
} from "../lib/geometry";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  WEEKDAYS,
  formatRange,
  formatTime,
} from "../lib/labels";
import type { Occurrence } from "../lib/types";

/**
 * La vue semaine, avec une bande de journées entières au-dessus de la grille
 * horaire — la séparation que fait Google, et pour la même raison : un congé de
 * trois jours n'a pas de place dans une colonne d'heures.
 *
 * Les chevauchements sont résolus en couloirs : les événements qui se
 * recouvrent forment un groupe, et se partagent la largeur de la colonne. Sans
 * cela, deux rendez-vous à la même heure se peindraient l'un sur l'autre et le
 * second serait invisible.
 */

// Une heure vaut 44 pixels : à 52, la journée de travail ne tenait pas dans la
// carte et il fallait faire défiler pour voir un rendez-vous de 17 h. À moins,
// un créneau de trente minutes n'accueille plus son titre.
const HOUR_HEIGHT = 44;
const MIN_BLOCK = 18;
const DAY = 86_400_000;
/** Appui long qui arme un geste au doigt. En deçà, c'est un tapotement. */
const LONG_PRESS_MS = 450;
/** Au-delà de ce déplacement avant l'appui long, le doigt fait défiler. */
const PRESS_SLOP_PX = 8;

type Placed = { occurrence: Occurrence; column: number; columns: number };

function layoutDay(list: Occurrence[]): Placed[] {
  const sorted = [...list].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime(),
  );

  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let lanes: number[] = [];
  let clusterEnd = 0;

  const flush = () => {
    const columns = cluster.reduce((max, item) => Math.max(max, item.column + 1), 1);
    for (const item of cluster) placed.push({ ...item, columns });
    cluster = [];
    lanes = [];
  };

  for (const occurrence of sorted) {
    if (cluster.length > 0 && occurrence.start.getTime() >= clusterEnd) flush();

    let column = lanes.findIndex((end) => end <= occurrence.start.getTime());
    if (column === -1) column = lanes.length;
    lanes[column] = occurrence.end.getTime();

    cluster.push({ occurrence, column, columns: 1 });
    clusterEnd = Math.max(clusterEnd, occurrence.end.getTime());
  }
  if (cluster.length > 0) flush();

  return placed;
}

/*
Position verticale d'un instant, **en pourcentage** de la plage affichée.

En pixels, la grille faisait sa hauteur et laissait le bas de la carte vide :
treize heures à quarante-quatre pixels ne remplissent pas un grand écran. En
pourcentage, les rangées d'heures s'étirent pour occuper la place disponible et
les blocs suivent, sans que rien n'ait à mesurer quoi que ce soit au montage.
HOUR_HEIGHT reste le plancher : au-dessous, un créneau d'une demi-heure ne
porterait plus son titre.
*/
function offsetOf(date: Date, day: Date): number {
  return ratioOfMinutes((date.getTime() - startOfDay(day).getTime()) / 60_000);
}

/*
Un glissement, quel que soit ce qu'il fabrique.

Trois gestes partagent la même mécanique : tracer un créneau sur le vide,
déplacer un rendez-vous, tirer son bord inférieur. Ils ne diffèrent que par ce
qui bouge — les deux bornes, ou une seule — d'où un seul état et un seul
`pointermove`.

`moved` distingue le clic du glissement : sans mouvement, un clic doit donner
une heure pleine et non un quart d'heure de rien du tout.
*/
type Drag = {
  mode: "create" | "move" | "resize";
  occurrence?: Occurrence;
  day: number;
  from: number;
  to: number;
  /** Point d'ancrage : la borne qui ne bouge pas pendant le geste. */
  anchor: number;
  /** Écart entre le curseur et le début, pour qu'un déplacement ne recale pas
   * le bloc sous le pointeur. */
  grab: number;
  moved: boolean;
};

export function WeekGrid({
  cursor,
  today,
  now,
  occurrences,
  onSelect,
  onCreate,
  onMove,
}: {
  cursor: Date;
  today: Date;
  now: Date;
  occurrences: Occurrence[];
  onSelect: (occurrence: Occurrence) => void;
  /** Absent quand le compte n'a pas le droit d'écrire dans l'agenda. */
  onCreate?: (start: Date, end: Date) => void;
  onMove?: (occurrence: Occurrence, start: Date, end: Date) => void;
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, index) => DAY_START_HOUR + index,
  );

  const allDay = occurrences.filter((o) => o.allDay);
  const hasToday = days.some((day) => isSameDay(day, today));

  const columnRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  /*
   * Le geste en cours vit aussi dans une référence.
   *
   * L'état sert à peindre ; la référence sert à décider. Lire l'état depuis un
   * gestionnaire attaché à la fenêtre le donnerait figé à sa valeur de
   * montage, et le commettre depuis un `setState` reviendrait à prévenir le
   * parent pendant qu'un enfant se rend — ce que React refuse, à raison.
   */
  const dragRef = useRef<Drag | null>(null);

  function apply(next: Drag | null) {
    dragRef.current = next;
    setDrag(next);
  }

  const editable = onCreate !== undefined || onMove !== undefined;

  /*
   * Au doigt, le geste s'arme par un appui long, jamais au contact.
   *
   * Le tracé commençait au premier contact : sur un téléphone, poser le doigt
   * pour faire défiler la journée créait un rendez-vous ou déplaçait celui
   * qu'on touchait, et la grille ne défilait jamais. La grille déclare
   * `touch-action: pan-y` — le glisser simple appartient au navigateur — et
   * c'est l'appui long qui passe la main au geste. À la souris, rien ne change.
   */
  const pressRef = useRef<{ timer: number; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Le dernier contact : souris ou doigt, et s'il a armé un geste. */
  const contactRef = useRef<{ mouse: boolean; armed: boolean }>({ mouse: true, armed: false });

  function cancelPress() {
    if (!pressRef.current) return;
    window.clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  }

  function press(mode: Drag["mode"], event: React.PointerEvent, occurrence?: Occurrence) {
    contactRef.current = { mouse: event.pointerType === "mouse", armed: false };
    if (event.pointerType === "mouse") {
      // Empêche la sélection de texte pendant un glissement à la souris.
      event.preventDefault();
      begin(mode, event.clientX, event.clientY, occurrence);
      return;
    }
    cancelPress();
    const { clientX: x, clientY: y } = event;
    const timer = window.setTimeout(() => {
      pressRef.current = null;
      contactRef.current = { mouse: false, armed: true };
      begin(mode, x, y, occurrence);
      // Le téléphone dit que le geste est pris, quand il sait vibrer.
      if ("vibrate" in navigator) navigator.vibrate(10);
    }, LONG_PRESS_MS);
    pressRef.current = { timer, x, y };
  }

  /*
   * Une fois le geste armé, le doigt ne doit plus faire défiler.
   *
   * `touch-action` se décide au contact : le navigateur a déjà promis le
   * défilement vertical, et il le prendrait au premier mouvement en annulant
   * le pointeur. Un `touchmove` annulé le lui reprend. L'écouteur est posé au
   * montage et non pendant le geste : Safari ne consulte que les écouteurs
   * déjà présents au contact, et il est non passif pour avoir le droit
   * d'annuler.
   */
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const hold = (event: TouchEvent) => {
      if (dragRef.current && event.cancelable) event.preventDefault();
    };
    node.addEventListener("touchmove", hold, { passive: false });
    return () => {
      node.removeEventListener("touchmove", hold);
      cancelPress();
    };
  }, []);

  /*
   * Le suivi se fait sur la fenêtre, pas sur la grille.
   *
   * Un curseur sorti de la carte pendant le geste cesserait d'émettre des
   * événements sur elle, et le bloc resterait figé à mi-course sans que le
   * relâchement soit jamais vu — un glissement qui ne se termine pas.
   */
  useEffect(() => {
    if (!drag) return;

    const track = (event: PointerEvent) => {
      const current = dragRef.current;
      const rect = columnRef.current?.getBoundingClientRect();
      if (!current || !rect) return;
      const slot = pointToSlot(rect, event.clientX, event.clientY);
      const moved =
        current.moved || slot.minutes !== current.anchor || slot.day !== current.day;

      if (current.mode === "resize") {
        apply({ ...current, moved, to: Math.max(slot.minutes, current.from + STEP_MINUTES) });
        return;
      }
      if (current.mode === "move") {
        const length = current.to - current.from;
        const from = clamp(slot.minutes - current.grab, 0, 24 * 60 - length);
        apply({ ...current, moved, day: slot.day, from, to: from + length });
        return;
      }
      // Tracé : l'ancre tient, l'autre borne suit le curseur, au-dessus comme
      // au-dessous.
      apply({
        ...current,
        moved,
        from: Math.min(current.anchor, slot.minutes),
        to: Math.max(current.anchor + STEP_MINUTES, slot.minutes),
      });
    };

    const release = () => {
      const current = dragRef.current;
      apply(null);
      if (!current) return;

      const day = days[current.day];
      if (current.mode === "create") {
        const span = current.moved ? current.to - current.from : DEFAULT_MINUTES;
        onCreate?.(at(day, current.from), at(day, current.from + span));
      } else if (current.moved && current.occurrence) {
        onMove?.(current.occurrence, at(day, current.from), at(day, current.to));
      } else if (current.occurrence) {
        // Un clic sur un bloc, sans mouvement : c'est une ouverture de fiche.
        onSelect(current.occurrence);
      }
    };

    window.addEventListener("pointermove", track);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointermove", track);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [drag !== null, days, onCreate, onMove, onSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  function begin(mode: Drag["mode"], x: number, y: number, occurrence?: Occurrence) {
    const rect = columnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const slot = pointToSlot(rect, x, y);

    if (occurrence) {
      const from = minutesOfDate(occurrence.start);
      const to = minutesOfDate(occurrence.end);
      apply({
        mode,
        occurrence,
        day: slot.day,
        from,
        to,
        anchor: mode === "resize" ? from : to,
        grab: slot.minutes - from,
        moved: false,
      });
      return;
    }

    apply({
      mode: "create",
      day: slot.day,
      from: slot.minutes,
      to: slot.minutes + STEP_MINUTES,
      anchor: slot.minutes,
      grab: 0,
      moved: false,
    });
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", editable && "select-none")}>
      {/* En-tête : jour, date, et la bande des journées entières. */}
      <div className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] border-b">
        <div className="border-r" />
        {days.map((day, index) => (
          <div
            key={day.toISOString()}
            className={cn(
              "flex items-center justify-center gap-1.5 border-r px-1 py-1 last:border-r-0",
              index >= 5 && "bg-muted/20",
            )}
          >
            <span className="text-muted-foreground text-[11px]">{WEEKDAYS[index]}</span>
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[13px] tabular-nums",
                isSameDay(day, today) && "bg-brand font-medium text-brand-ink",
              )}
            >
              {day.getDate()}
            </span>
          </div>
        ))}
      </div>

      {allDay.length > 0 && (
        <div className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] border-b">
          {/* Gouttière muette : « journée » écrit ici ne servait qu'à
              remplir une colonne dont la position dit déjà tout. */}
          <div className="border-r" />
          {days.map((day) => {
            const from = startOfDay(day).getTime();
            const items = allDay.filter(
              (o) => o.start.getTime() < from + DAY && o.end.getTime() > from,
            );
            return (
              <div
                key={day.toISOString()}
                className="flex flex-col gap-px border-r px-0.5 py-1 last:border-r-0"
              >
                {items.map((occurrence) => {
                  const style = occurrence.style;
                  return (
                    <button
                      key={occurrence.key}
                      type="button"
                      onClick={() => onSelect(occurrence)}
                      className={cn(
                        "h-4 truncate rounded-sm px-1.5 text-left text-[11px] leading-4 font-medium",
                        style.solid,
                      )}
                    >
                      {occurrence.event.title}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <div
        ref={scrollRef}
        data-demo="agenda-week-touch"
        className="relative min-h-0 flex-1 touch-pan-y overflow-y-auto [-webkit-touch-callout:none]"
        onPointerMove={(event) => {
          const pending = pressRef.current;
          if (
            pending &&
            Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > PRESS_SLOP_PX
          ) {
            cancelPress();
          }
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        // L'appui long ouvre sinon le menu contextuel du système par-dessus.
        onContextMenu={(event) => {
          if (editable) event.preventDefault();
        }}
      >
        {/* Deux planchers, et le plus haut gagne : la hauteur disponible pour
            remplir la carte, la hauteur en pixels pour rester lisible quand la
            fenêtre est basse — auquel cas la grille défile. */}
        <div
          className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))]"
          style={{ minHeight: `max(100%, ${hours.length * HOUR_HEIGHT}px)` }}
        >
          {/* Colonne des heures. */}
          <div className="flex flex-col border-r">
            {hours.map((hour) => (
              <div
                key={hour}
                className="text-muted-foreground/70 relative flex-1 pr-1.5 text-right text-[10px] tabular-nums"
              >
                <span className="absolute -top-1.5 right-1.5">{hour}h</span>
              </div>
            ))}
          </div>

          {days.map((day, index) => {
            const from = startOfDay(day).getTime();
            const timed = occurrences.filter(
              (o) => !o.allDay && o.start.getTime() >= from && o.start.getTime() < from + DAY,
            );
            const placed = layoutDay(timed);

            return (
              <div
                key={day.toISOString()}
                // La première colonne sert de mètre étalon : sa gauche donne
                // l'origine, sa largeur le pas, sa hauteur la plage horaire.
                ref={index === 0 ? columnRef : undefined}
                onPointerDown={(event) => {
                  // Seul le vide déclenche un tracé ; un bloc a son propre
                  // gestionnaire, qui ne doit pas être doublé par celui-ci.
                  if (onCreate && event.target === event.currentTarget) press("create", event);
                }}
                className={cn(
                  "relative flex flex-col border-r last:border-r-0",
                  day.getDay() % 6 === 0 && "bg-muted/20",
                  onCreate && "cursor-cell",
                )}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    onPointerDown={(event) => onCreate && press("create", event)}
                    className={cn(
                      "flex-1 border-b last:border-b-0",
                      onCreate && "hover:bg-accent/20 transition-colors",
                    )}
                  />
                ))}

                {/* Le créneau en cours de tracé, ou le bloc en déplacement. */}
                {drag && drag.day === index && (
                  <div
                    style={{
                      top: `${ratioOfMinutes(drag.from)}%`,
                      height: `${ratioOfMinutes(drag.to) - ratioOfMinutes(drag.from)}%`,
                    }}
                    className={cn(
                      "bg-brand/25 border-brand-text text-brand-text pointer-events-none absolute inset-x-0.5 z-20",
                      "overflow-hidden rounded-sm border-l-2 px-1 py-px text-[10px] leading-[13px] font-medium",
                    )}
                  >
                    {formatTime(at(day, drag.from))} – {formatTime(at(day, drag.to))}
                  </div>
                )}

                {hasToday && isSameDay(day, today) && (
                  <div
                    className="bg-danger pointer-events-none absolute inset-x-0 z-10 h-px"
                    style={{ top: `${offsetOf(now, day)}%` }}
                  >
                    <span className="bg-danger absolute -top-1 -left-1 size-2 rounded-full" />
                  </div>
                )}

                {placed.map(({ occurrence, column, columns }) => {
                  const style = occurrence.style;
                  const top = offsetOf(occurrence.start, day);
                  const height = offsetOf(occurrence.end, day) - top;
                  const minutes =
                    (occurrence.end.getTime() - occurrence.start.getTime()) / 60_000;
                  const width = 100 / columns;

                  const dragged = drag?.occurrence?.key === occurrence.key;

                  return (
                    <div
                      key={occurrence.key}
                      role="button"
                      tabIndex={0}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (onMove) press("move", event, occurrence);
                      }}
                      onClick={() => {
                        // Sans droit d'écriture il n'y a pas de glissement :
                        // le clic reste le seul moyen d'ouvrir la fiche. Au
                        // doigt non plus : un tapotement n'arme aucun geste,
                        // c'est donc le clic qui ouvre. À la souris, c'est le
                        // relâchement qui a déjà décidé.
                        const contact = contactRef.current;
                        if (!onMove || (!contact.mouse && !contact.armed)) onSelect(occurrence);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") onSelect(occurrence);
                      }}
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        minHeight: MIN_BLOCK,
                        left: `calc(${column * width}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                      }}
                      className={cn(
                        "absolute overflow-hidden rounded-sm border-l-2 px-1 py-px text-left leading-[13px]",
                        style.soft,
                        style.rail,
                        onMove && "cursor-grab active:cursor-grabbing",
                        dragged && "opacity-40",
                      )}
                      title={`${formatRange(occurrence.start, occurrence.end, false)} — ${occurrence.event.title}`}
                    >
                      {/* Ce qui s'affiche suit la place disponible. Un créneau
                          de trente minutes n'a la place que de son titre, et
                          l'heure y serait de toute façon redondante avec la
                          gouttière juste à gauche. */}
                      <span className="block truncate text-[11px] font-medium">
                        {occurrence.event.title}
                      </span>
                      {minutes >= 40 && (
                        <span className="text-muted-foreground block truncate text-[10px]">
                          {formatRange(occurrence.start, occurrence.end, false)}
                        </span>
                      )}
                      {minutes >= 75 && occurrence.event.location && (
                        <span className="text-muted-foreground/80 block truncate text-[10px]">
                          {occurrence.event.location}
                        </span>
                      )}

                      {/* La poignée de redimensionnement : quatre pixels au bas
                          du bloc, invisibles jusqu'au survol. Un bord épais
                          rognerait le texte des créneaux courts. */}
                      {onMove && (
                        <span
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            press("resize", event, occurrence);
                          }}
                          className="hover:bg-foreground/20 absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize rounded-b-[3px]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
