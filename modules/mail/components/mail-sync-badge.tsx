"use client";

import { useState } from "react";
import { CheckIcon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAgo } from "@/shared/lib/format";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { MailRun } from "../lib/types";

/**
 * Quand la boîte a été relue, et le bouton pour ne pas attendre.
 *
 * L'écran ne le disait nulle part : il fallait ouvrir les réglages pour savoir
 * si la copie avait tourné, et le seul bouton pour la déclencher y vivait
 * aussi. Une boîte dont on ignore la fraîcheur se lit comme une boîte en
 * panne — c'est exactement l'impression qu'elle donnait tant qu'aucune copie
 * automatique ne tournait.
 *
 * Quatre états et pas trois : « jamais copiée » n'est pas « à jour ». Même
 * grammaire que le badge de l'agenda, à dessein — deux copies, une seule façon
 * de les lire.
 */
export function MailSyncBadge({
  running,
  last,
  now,
  onDone,
}: {
  running: boolean;
  last: MailRun | null;
  now: number;
  /** Rafraîchit le journal ; la copie, elle, tourne côté serveur. */
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const failed = !running && last !== null && last.error !== "";
  const tone = running
    ? "border-info/30 bg-info-soft/50 text-info"
    : failed
      ? "border-danger/30 bg-danger-soft/50 text-danger"
      : last
        ? "border-success/30 bg-success-soft/50 text-success"
        : "border-border bg-muted text-muted-foreground";

  async function relire() {
    setPending(true);
    setError(null);
    try {
      await api.syncNow();
      onDone();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  const occupe = running || pending;

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={relire}
        disabled={occupe}
        title={
          occupe
            ? "Une copie est en cours"
            : "Relire la boîte maintenant. Elle est relue toute seule toutes les cinq minutes."
        }
        className={cn(
          "group inline-flex items-center gap-2 rounded-full border py-1 pr-2.5 pl-2.5",
          "text-xs font-medium transition-colors hover:brightness-95 disabled:cursor-default",
          tone,
        )}
      >
        <span className="relative flex size-2">
          {occupe && (
            <span className="bg-info absolute inline-flex size-full animate-ping rounded-full opacity-75" />
          )}
          <span
            className={cn(
              "relative inline-flex size-2 rounded-full",
              occupe
                ? "bg-info"
                : failed
                  ? "bg-danger"
                  : last
                    ? "bg-success"
                    : "bg-muted-foreground/50",
            )}
          />
        </span>

        <span>
          {occupe
            ? "Copie en cours…"
            : failed
              ? "Dernière copie en échec"
              : last
                ? `Copiée ${formatAgo(last.finished_at, now)}`
                : "Jamais copiée"}
        </span>

        {!occupe &&
          (last === null ? null : failed ? (
            <TriangleAlertIcon className="size-3.5 opacity-60" />
          ) : (
            <CheckIcon className="size-3.5 opacity-60" />
          ))}

        {!occupe && (
          <RefreshCwIcon className="size-3.5 opacity-40 transition-transform group-hover:rotate-90" />
        )}
      </button>
      {error && <span className="text-danger text-[11px]">{error}</span>}
    </span>
  );
}
