"use client";

import { CheckIcon, ChevronRightIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAgo } from "@/shared/lib/format";
import type { ImportRun, SyncRun } from "../lib/types";

/**
 * L'état d'une copie, en une pastille cliquable.
 *
 * Quatre états et pas trois : « jamais » n'est pas « à jour ». Un badge vert au
 * premier chargement, avant que quoi que ce soit n'ait été copié, ferait croire
 * que l'agenda est vide alors qu'il n'a simplement pas encore été lu.
 *
 * Le point pulse pendant l'exécution. C'est la seule animation de l'écran, et
 * elle porte une information : quelque chose se passe en ce moment, à un
 * endroit où l'on n'attend rien puisque tout se fait côté serveur.
 *
 * **Le verdict est calculé par l'appelant, pas ici.** Il y a deux étages à
 * surveiller — le miroir Google et l'import — et ils ne racontent pas la même
 * chose : le premier dit ce que Google a rendu, le second ce que la grille
 * affiche. Un badge qui saurait lire l'un des deux imposerait son point de vue
 * aux deux écrans, et c'est précisément la confusion qui a laissé un agenda de
 * trois jours de retard afficher « à jour ».
 */
export type BadgeState = "running" | "failed" | "ok" | "never";

export type BadgeVerdict = { state: BadgeState; label: string };

export function SyncBadge({
  state,
  label,
  title,
  onClick,
}: BadgeVerdict & { title?: string; onClick: () => void }) {
  const tone =
    state === "running"
      ? "border-info/30 bg-info-soft/50 text-info"
      : state === "failed"
        ? "border-danger/30 bg-danger-soft/50 text-danger"
        : state === "ok"
          ? "border-success/30 bg-success-soft/50 text-success"
          : "border-border bg-muted text-muted-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? "Voir le journal de synchronisation"}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border py-1 pr-1.5 pl-2.5",
        "text-xs font-medium transition-colors hover:brightness-95",
        tone,
      )}
    >
      <span className="relative flex size-2">
        {state === "running" && (
          <span className="bg-info absolute inline-flex size-full animate-ping rounded-full opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            state === "running"
              ? "bg-info"
              : state === "failed"
                ? "bg-danger"
                : state === "ok"
                  ? "bg-success"
                  : "bg-muted-foreground/50",
          )}
        />
      </span>

      <span>{label}</span>

      {(state === "failed" || state === "ok") && (
        <span className="opacity-60">
          {state === "failed" ? (
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

/**
 * Le verdict du **miroir** : ce que la copie de Google a rapporté.
 *
 * C'est celui de l'écran de réglages, où l'on regarde le raccordement lui-même.
 */
export function mirrorVerdict(
  running: boolean,
  last: SyncRun | null,
  now: number,
): BadgeVerdict {
  if (running) return { state: "running", label: "Synchronisation en cours…" };
  if (!last) return { state: "never", label: "Jamais synchronisé" };
  if (last.error !== "")
    return { state: "failed", label: `Échec ${formatAgo(last.started_at, now)}` };

  const changes = last.created + last.updated + last.deleted;
  const when = formatAgo(last.finished_at ?? last.started_at, now);
  // Dire « à jour » sans plus est vrai mais creux : le nombre de changements
  // est ce qui distingue une copie qui travaille d'une copie qui tourne à vide.
  return {
    state: "ok",
    label:
      changes > 0
        ? `${changes} changement${changes > 1 ? "s" : ""} · ${when}`
        : `À jour · ${when}`,
  };
}

/**
 * Le verdict de **l'agenda affiché**, qui est la somme des deux étages.
 *
 * C'est celui de la grille, et il ne pouvait pas être celui du miroir. Le
 * miroir se tenait à jour toutes les cinq minutes pendant que l'import, resté
 * manuel, prenait trois jours de retard : le badge disait « à jour » au-dessus
 * d'un agenda amputé de onze rendez-vous. Ce que l'utilisateur regarde vient de
 * l'import ; c'est donc sa fraîcheur qui est affichée.
 *
 * Une panne du miroir l'emporte quand même. Un import qui réussit sur un miroir
 * qui échoue ne rapporte rien de neuf, et se dire « à jour » dans ce cas serait
 * le même mensonge, pris par l'autre bout.
 */
export function agendaVerdict(
  mirror: { running: boolean; last: SyncRun | null },
  imports: { running: boolean; last: ImportRun | null },
  now: number,
): BadgeVerdict & { blame: "miroir" | "import" } {
  if (mirror.last !== null && mirror.last.error !== "") {
    return {
      state: "failed",
      label: `Copie Google en échec ${formatAgo(mirror.last.started_at, now)}`,
      blame: "miroir",
    };
  }
  if (imports.running || mirror.running) {
    return { state: "running", label: "Mise à jour en cours…", blame: "import" };
  }
  if (!imports.last) {
    return { state: "never", label: "Jamais importé", blame: "import" };
  }
  if (imports.last.error !== "") {
    return {
      state: "failed",
      label: `Import en échec ${formatAgo(imports.last.started_at, now)}`,
      blame: "import",
    };
  }

  const when = formatAgo(imports.last.finished_at ?? imports.last.started_at, now);
  return { state: "ok", label: `Agenda à jour · ${when}`, blame: "import" };
}
