"use client";

import { CheckIcon, ChevronRightIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAgo } from "@/shared/lib/format";
import type { SyncRun } from "../lib/types";

/**
 * L'état de la copie, en une pastille cliquable.
 *
 * Quatre états et pas trois : « jamais » n'est pas « à jour ». Un badge vert au
 * premier chargement, avant que quoi que ce soit n'ait été copié, ferait croire
 * que l'agenda est vide alors qu'il n'a simplement pas encore été lu.
 *
 * Le point pulse pendant l'exécution. C'est la seule animation de l'écran, et
 * elle porte une information : quelque chose se passe en ce moment, à un
 * endroit où l'on n'attend rien puisque tout se fait côté serveur.
 */
export function SyncBadge({
  running,
  last,
  now,
  onClick,
}: {
  running: boolean;
  last: SyncRun | null;
  now: number;
  onClick: () => void;
}) {
  const failed = !running && last !== null && last.error !== "";
  const tone = running
    ? "border-info/30 bg-info-soft/50 text-info"
    : failed
      ? "border-danger/30 bg-danger-soft/50 text-danger"
      : last
        ? "border-success/30 bg-success-soft/50 text-success"
        : "border-border bg-muted text-muted-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      title="Voir le journal de synchronisation"
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border py-1 pr-1.5 pl-2.5",
        "text-xs font-medium transition-colors hover:brightness-95",
        tone,
      )}
    >
      <span className="relative flex size-2">
        {running && (
          <span className="bg-info absolute inline-flex size-full animate-ping rounded-full opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            running
              ? "bg-info"
              : failed
                ? "bg-danger"
                : last
                  ? "bg-success"
                  : "bg-muted-foreground/50",
          )}
        />
      </span>

      <span>{label(running, failed, last, now)}</span>

      {!running && last !== null && (
        <span className="opacity-60">
          {failed ? (
            <TriangleAlertIcon className="size-3.5" />
          ) : (
            <CheckIcon className="size-3.5" />
          )}
        </span>
      )}

      <ChevronRightIcon className="size-3.5 opacity-40 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function label(
  running: boolean,
  failed: boolean,
  last: SyncRun | null,
  now: number,
): string {
  if (running) return "Synchronisation en cours…";
  if (!last) return "Jamais synchronisé";
  if (failed) return `Échec ${formatAgo(last.started_at, now)}`;

  const changes = last.created + last.updated + last.deleted;
  const when = formatAgo(last.finished_at ?? last.started_at, now);
  // Dire « à jour » sans plus est vrai mais creux : le nombre de changements
  // est ce qui distingue une copie qui travaille d'une copie qui tourne à vide.
  return changes > 0 ? `${changes} changement${changes > 1 ? "s" : ""} · ${when}` : `À jour · ${when}`;
}
