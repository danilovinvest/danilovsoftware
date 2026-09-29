"use client";

import { CheckIcon, PauseIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CYCLE_LABEL, type CyclePoint, type StepState } from "../lib/cycle";
import { StepDot, type CycleEdit } from "./cycle-step-panel";

// Le type vit avec le panneau qui le lit ; la frise le réexporte pour ses appelants.
export type { CycleEdit };

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
 *
 * **Les crans se cochent, et dans n'importe quel ordre.** La frise ne faisait
 * que lire : un cran franchi dans la vie mais dépourvu de la pièce qui l'aurait
 * prouvé — un client qui signe sans qu'aucun rendez-vous n'ait été saisi —
 * restait gris, et rien ne permettait de le dire. Chaque cran ouvre donc un
 * panneau qui annonce **ce que le clic va écrire, et où**, parce qu'aucun cran
 * n'écrit chez lui : la date de chantier va sur l'affaire, l'acompte sur le
 * devis, les jalons dans leur table. Un cran n'attend jamais celui d'avant.
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
  edit,
}: {
  points: CyclePoint[];
  size?: CycleSize;
  className?: string;
  /** Absent, la frise se lit seulement. */
  edit?: CycleEdit;
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
            className={cn("relative flex min-w-0 flex-col", last ? "shrink-0" : "flex-1")}
            title={point.detail}
          >
            {/*
              La barre est posée derrière, en absolu, et non entre le point et
              son libellé.

              C'est ce qui permet au **cran entier** — le point et son
              libellé — d'être un seul bouton. Tant qu'elle vivait dans le flux,
              elle séparait les deux et le clic ne portait que sur le point, large
              de quatorze pixels : viser le mot « Signé » ne faisait que
              sélectionner le mot. Un cran qu'on ne peut cocher qu'en visant une
              pastille n'est pas cochable.
            */}
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute right-0 h-0.5",
                  compact ? "top-1 left-2.5" : "top-1.5 left-3.5",
                  BAR[linkState === "todo" ? "todo" : point.state],
                )}
              />
            )}

            {edit ? (
              <StepDot point={point} edit={edit}>
                <Cran point={point} compact={compact} />
              </StepDot>
            ) : (
              <Cran point={point} compact={compact} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Le contenu d'un cran : son point, son libellé, sa date.
 *
 * Un seul rendu pour la frise qui se lit et celle qui se coche — sans quoi le
 * cran cliquable finirait par ne plus ressembler au cran affiché ailleurs.
 */
function Cran({ point, compact }: { point: CyclePoint; compact: boolean }) {
  return (
    <>
      <Dot state={point.state} compact={compact} />
      {/*
        Les libellés disparaissent sous 640 pixels.

        Dix crans sur 390 pixels donnaient « ContaRtDV Devis NégociSaitgioné » :
        les mots se chevauchaient et la frise ne disait plus rien. Les points
        restent, la barre reste, et le nom du cran s'obtient en le touchant —
        le panneau le dit déjà.
      */}
      {!compact && (
        <div className="hidden min-w-0 pt-1 pr-2 sm:block">
          <div
            className={cn(
              "group-hover/cran:text-foreground truncate text-[0.7rem] leading-tight",
              TEXT[point.state],
            )}
          >
            {CYCLE_LABEL[point.step].short}
          </div>
          <div className="text-muted-foreground/70 truncate text-[0.65rem] leading-tight">
            {caption(point)}
          </div>
        </div>
      )}
    </>
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
        "flex shrink-0 items-center justify-center rounded-full border-2 transition-shadow",
        size,
        DOT[state],
        // Le cran courant respire : un halo le distingue sans ajouter de
        // couleur, ce qui reste lisible pour qui ne les perçoit pas toutes.
        state === "current" && "ring-info/25 ring-3",
        // Le halo au survol suit le bouton, pas le point : c'est tout le cran
        // qui répond au clic, y compris son libellé.
        "group-hover/cran:ring-foreground/20 group-hover/cran:ring-3",
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

