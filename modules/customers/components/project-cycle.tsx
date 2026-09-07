"use client";

import { CheckIcon, PauseIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CYCLE_LABEL, type CyclePoint, type StepState } from "../lib/cycle";

/**
 * La frise du cycle : huit crans, d'un coup d'œil.
 *
 * Un seul composant à trois tailles, pas trois composants. La frise se lit sur
 * la fiche, dans la liste et sur le tableau de bord : trois implémentations
 * auraient divergé, et un même cran aurait fini vert ici et gris là.
 *
 * Les couleurs sortent toutes de la couche sémantique du thème. Aucune valeur
 * littérale : le mode sombre ne redéfinit que l'échelle, et une couleur en dur
 * casserait cette propriété.
 */

export type CycleSize = "full" | "compact" | "mini";

const DOT: Record<StepState, string> = {
  done: "bg-success border-success",
  current: "bg-info border-info",
  todo: "bg-transparent border-border",
  blocked: "bg-danger border-danger",
  skipped: "bg-warning border-warning",
};

const BAR: Record<StepState, string> = {
  done: "bg-success",
  current: "bg-info",
  todo: "bg-border",
  blocked: "bg-danger",
  skipped: "bg-warning",
};

const TEXT: Record<StepState, string> = {
  done: "text-muted-foreground",
  current: "text-foreground font-medium",
  todo: "text-muted-foreground/50",
  blocked: "text-danger",
  skipped: "text-warning",
};

export function ProjectCycle({
  points,
  size = "full",
  className,
}: {
  points: CyclePoint[];
  size?: CycleSize;
  className?: string;
}) {
  if (size === "mini") return <MiniCycle points={points} className={className} />;

  const compact = size === "compact";

  return (
    <ol
      className={cn("flex w-full items-start", className)}
      aria-label="Avancement de l'affaire"
    >
      {points.map((point, index) => {
        const last = index === points.length - 1;
        // La barre qui suit un cran prend l'état du cran suivant : elle relie
        // ce qui est fait à ce qui reste, et c'est le suivant qui décide.
        const linkState = last ? point.state : points[index + 1].state;

        return (
          <li
            key={point.step}
            className={cn("flex min-w-0 flex-col gap-1", last ? "shrink-0" : "flex-1")}
            title={point.detail}
          >
            <div className="flex items-center">
              <Dot state={point.state} compact={compact} />
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    "h-0.5 min-w-2 flex-1",
                    BAR[linkState === "todo" ? "todo" : point.state],
                  )}
                />
              )}
            </div>

            {!compact && (
              <div className="min-w-0 pr-2">
                <div className={cn("truncate text-[0.7rem] leading-tight", TEXT[point.state])}>
                  {CYCLE_LABEL[point.step].label}
                </div>
                <div className="text-muted-foreground/70 truncate text-[0.65rem] leading-tight">
                  {caption(point)}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Sous le libellé : la date si c'est fait, l'attente si c'est en cours. */
function caption(point: CyclePoint): string {
  if (point.state === "done" && point.at) {
    return new Date(point.at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }
  if (point.state === "blocked") return "arrêté";
  if (point.state === "skipped") return "en pause";
  if (point.state === "current") {
    return point.waiting !== null && point.waiting > 0 ? `${point.waiting} j` : "en cours";
  }
  return "";
}

function Dot({ state, compact }: { state: StepState; compact: boolean }) {
  const size = compact ? "size-2.5" : "size-3.5";
  const icon = compact ? null : glyph(state);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-2",
        size,
        DOT[state],
        // Le cran courant respire : un halo le distingue sans ajouter de
        // couleur, ce qui reste lisible pour qui ne les perçoit pas toutes.
        state === "current" && "ring-info/25 ring-3",
      )}
    >
      {icon}
    </span>
  );
}

function glyph(state: StepState) {
  const shared = "size-2 text-background";
  if (state === "done") return <CheckIcon className={shared} strokeWidth={4} />;
  if (state === "blocked") return <XIcon className={shared} strokeWidth={4} />;
  if (state === "skipped") return <PauseIcon className={cn(shared, "fill-background")} />;
  return null;
}

/**
 * La version d'une ligne de tableau : huit segments, aucun libellé.
 *
 * À cette taille les mots ne tiennent pas et les points isolés ne se comptent
 * pas. Des segments accolés se lisent comme une barre de progression, ce qui
 * est exactement la question posée dans une liste : jusqu'où est-on allé ?
 */
function MiniCycle({ points, className }: { points: CyclePoint[]; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      title={points.map((point) => point.detail).join(" · ")}
      aria-label={`Avancement : ${points.filter((p) => p.state === "done").length} sur ${points.length}`}
    >
      {points.map((point) => (
        <span
          key={point.step}
          className={cn(
            "h-1.5 w-3 rounded-sm first:rounded-l-[3px] last:rounded-r-[3px]",
            point.state === "todo" ? "bg-border" : BAR[point.state],
            point.state === "current" && "animate-pulse",
          )}
        />
      ))}
    </span>
  );
}
