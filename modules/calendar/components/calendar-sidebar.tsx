"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImportRuns } from "../hooks/use-import-runs";
import { useSyncRuns } from "../hooks/use-sync-runs";
import { EVENT_KIND_TONE, paletteAt } from "../lib/labels";
import type { Calendar, EventKind } from "../lib/types";
import { ImportLogDialog } from "./import-log";
import { SyncBadge, agendaVerdict } from "./sync-badge";
import { SyncLogDialog } from "./sync-log-dialog";

type Entry = Calendar & { hidden: boolean; count: number };

type KindEntry = {
  kind: EventKind;
  label: string;
  hidden: boolean;
  count: number;
};

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
  kinds,
  onToggleKind,
  loaded,
}: {
  calendars: Entry[];
  onToggle: (id: string) => void;
  kinds: KindEntry[];
  onToggleKind: (kind: EventKind) => void;
  loaded: number;
}) {
  const journal = useSyncRuns(60);
  const imports = useImportRuns(20);
  const [journalOpen, setJournalOpen] = useState(false);
  const [importLogOpen, setImportLogOpen] = useState(false);

  /*
    Le badge de la grille rend compte de ce que la grille affiche.

    Il lisait le miroir, qui se tient à jour toutes les cinq minutes — et il
    affichait donc « à jour » au-dessus d'un agenda auquel il manquait onze
    rendez-vous, parce que l'import, lui, attendait un clic. Ce qu'on voit ici
    vient de l'import ; c'est sa fraîcheur qu'il faut lire, et le miroir ne
    reprend la parole que lorsqu'il est en panne.
  */
  const verdict = agendaVerdict(journal, imports, imports.now);

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-60">
      <div className="bg-card flex flex-col items-start gap-2 rounded-xl border p-3">
        <SyncBadge
          state={verdict.state}
          label={verdict.label}
          title={
            verdict.blame === "miroir"
              ? "Voir le journal de la copie Google"
              : "Voir le journal des imports"
          }
          // On ouvre le journal qui explique le problème, pas celui qui se
          // trouve être le plus proche : un badge rouge qui mène à un écran
          // vert ferait chercher la panne là où elle n'est pas.
          onClick={() =>
            verdict.blame === "miroir" ? setJournalOpen(true) : setImportLogOpen(true)
          }
        />
        <p className="text-muted-foreground/70 text-[11px]">
          {loaded} événement{loaded > 1 ? "s" : ""} sur la période affichée
        </p>
      </div>

      {calendars.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground px-1 text-[11px] font-medium tracking-wide uppercase">
            Agendas
          </p>
          {calendars.map((calendar) => {
            const style = paletteAt(calendar.color);
            return (
              <button
                key={calendar.id}
                type="button"
                onClick={() => onToggle(calendar.id)}
                aria-pressed={!calendar.hidden}
                title={calendar.name}
                className="hover:bg-accent flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors"
              >
                <span
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded-sm border",
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
                  {calendar.name}
                </span>
                <span className="text-muted-foreground/70 shrink-0 text-[11px] tabular-nums">
                  {calendar.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Les catégories, sous les agendas et non mêlées à eux : l'agenda dit
          *où* vit un événement, la catégorie dit *ce qu'il est*. Deux
          questions, deux listes — les fondre obligerait à cocher dix cases
          pour n'en voir qu'une. */}
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground px-1 text-[11px] font-medium tracking-wide uppercase">
          Catégories
        </p>
        {kinds.map((entry) => (
          <button
            key={entry.kind}
            type="button"
            onClick={() => onToggleKind(entry.kind)}
            aria-pressed={!entry.hidden}
            className="hover:bg-accent flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors"
          >
            <span
              className={cn(
                "flex size-3.5 shrink-0 items-center justify-center rounded-sm border",
                entry.hidden
                  ? "border-input"
                  : cn("border-transparent", EVENT_KIND_TONE[entry.kind]),
              )}
            >
              {!entry.hidden && <CheckIcon className="size-2.5" strokeWidth={3} />}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-xs",
                entry.hidden && "text-muted-foreground line-through",
              )}
            >
              {entry.label}
            </span>
            <span className="text-muted-foreground/70 shrink-0 text-[11px] tabular-nums">
              {entry.count}
            </span>
          </button>
        ))}
      </div>

      <p className="text-muted-foreground/70 px-1 text-[11px] leading-relaxed">
        Les agendas se créent et se renomment dans Réglages&nbsp;→&nbsp;Agenda,
        où se fait aussi l&apos;import depuis Google.
      </p>

      <SyncLogDialog open={journalOpen} onClose={() => setJournalOpen(false)} />
      <ImportLogDialog open={importLogOpen} onOpenChange={setImportLogOpen} />
    </aside>
  );
}
