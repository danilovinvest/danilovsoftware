"use client";

import { OctagonXIcon, PauseIcon, PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TONE_SOFT } from "@/shared/ui/panel";
import { PROJECT_OUTCOME, isPaused } from "../lib/labels";
import type { ProjectOutcome } from "../lib/types";

export type ProjectHalt = {
  outcome: ProjectOutcome | null;
  note: string;
  /** Les mêmes droits que toute écriture d'issue : `customers:write`. */
  canWrite: boolean;
  pending: boolean;
  onHalt: () => void;
  onResume: () => void;
};

/**
 * Sous la frise : ce qui l'arrête, et le geste pour l'arrêter ou la reprendre.
 *
 * « Je veux pouvoir arrêter un chantier aussi dans la timeline, un bouton
 * explicite » — demandé le 29/09. Le geste n'existait que dans « à faire
 * maintenant », et seulement avant la signature (« Refusé », « Reporté ») : un
 * chantier signé qui s'interrompait n'avait nulle part où le dire. Le bouton est
 * **visible**, pas rangé dans un menu, et la frise dit en clair pourquoi elle
 * s'est arrêtée — une pastille qu'on lit sans ouvrir le cran courant.
 */
export function ProjectHaltBar({ halt }: { halt: ProjectHalt }) {
  const { outcome, note, canWrite, pending } = halt;
  const paused = outcome !== null && isPaused(outcome);
  if (outcome === null && !canWrite) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {outcome !== null && (
        <span
          data-demo="frise-arret-etat"
          title={note.trim() || undefined}
          className={cn(
            "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
            TONE_SOFT[paused ? "warning" : "danger"],
          )}
        >
          {paused ? <PauseIcon className="size-3 shrink-0" /> : <OctagonXIcon className="size-3 shrink-0" />}
          <span className="truncate">
            {paused ? "En pause" : "Arrêtée"} — {PROJECT_OUTCOME[outcome].label.toLowerCase()}
            {note.trim() && <span className="font-normal"> · {note.trim()}</span>}
          </span>
        </span>
      )}
      {canWrite && (
        <Button
          size="xs"
          variant="outline"
          className="ml-auto"
          // Deux noms, parce que la démo clique : elle ne doit jamais cliquer
          // « Reprendre », qui écrit.
          data-demo={outcome === null ? "frise-arret" : "frise-reprendre"}
          disabled={pending}
          onClick={outcome === null ? halt.onHalt : halt.onResume}
        >
          {outcome === null ? (
            <>
              <PauseIcon />
              Arrêter ou mettre en pause
            </>
          ) : (
            <>
              <PlayIcon />
              Reprendre
            </>
          )}
        </Button>
      )}
    </div>
  );
}
