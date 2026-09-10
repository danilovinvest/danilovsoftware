"use client";

import { useState } from "react";
import { CheckIcon, PauseIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateField } from "@/shared/ui/date-time-field";
import { cn } from "@/lib/utils";
import {
  CYCLE_LABEL,
  stepWrite,
  type CyclePoint,
  type CycleStep,
  type StepState,
} from "../lib/cycle";

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

/**
 * De quoi rendre un cran cliquable.
 *
 * Un seul accessoire plutôt que cinq : la frise se lit dans quatre écrans et
 * n'est modifiable que dans un — la fiche, où l'affaire est ouverte. Ailleurs,
 * `edit` est absent et la frise reste ce qu'elle était.
 */
export type CycleEdit = {
  /** La date que le clic retirerait, ou rien — voir `stepMarkedAt`. */
  markedAt: (step: CycleStep) => string | null;
  /**
   * Écrit ou retire ce cran. `null` retire.
   *
   * Rend une promesse **seulement** quand le cran n'a pas d'aperçu local — les
   * deux qui se lisent du devis. Le panneau attend alors la réponse avant de se
   * fermer, faute de quoi il disparaîtrait sur un point resté gris. Les autres
   * se peignent tout de suite et se ferment tout de suite.
   */
  onMark: (step: CycleStep, at: string | null) => void | Promise<void>;
  /** L'affaire porte-t-elle un devis ? L'acompte et le solde y vivent. */
  hasQuote: boolean;
  /** Ouvre la création d'un devis, quand il en manque un. */
  onAddQuote: () => void;
  pending?: boolean;
};

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
            className={cn("flex min-w-0 flex-col gap-1", last ? "shrink-0" : "flex-1")}
            title={point.detail}
          >
            <div className="flex items-center">
              {edit ? (
                <StepDot point={point} edit={edit} compact={compact} />
              ) : (
                <Dot state={point.state} compact={compact} />
              )}
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

function Dot({
  state,
  compact,
  interactive,
}: {
  state: StepState;
  compact: boolean;
  /** Le cran est cliquable : il le montre au survol, sans changer de taille. */
  interactive?: boolean;
}) {
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
        interactive && "group-hover/cran:ring-foreground/20 group-hover/cran:ring-3",
      )}
    >
      {icon}
    </span>
  );
}

/**
 * Un cran qu'on peut cocher, et le panneau qui dit ce que ça écrit.
 *
 * Le panneau annonce trois choses avant tout clic : où en est le cran, **où va
 * l'écriture**, et ce qui le franchirait tout seul. C'est ce qui empêche la
 * frise de devenir une seconde vérité : cocher « Date de chantier » ici et
 * ouvrir l'écran Chantiers montre la même date, parce que c'est la même
 * colonne.
 *
 * Un cran déjà franchi par une pièce de l'affaire — un devis accepté, un
 * échange enregistré — ne propose rien : il n'y a rien à retirer ici, et un
 * bouton sans effet est pire qu'un bouton absent. Le panneau le dit.
 */
function StepDot({
  point,
  edit,
  compact,
}: {
  point: CyclePoint;
  edit: CycleEdit;
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const write = stepWrite(point.step);
  const marked = edit.markedAt(point.step);
  const entry = CYCLE_LABEL[point.step];

  /*
    Franchi par un fait qu'on ne tient pas ici : le clic ne pourrait rien
    retirer, et marquer par-dessus n'ajouterait rien.

    `byFact` compte autant que l'absence de marque, et c'est le cas le plus
    traître : un rapport de visite marqué sur une affaire qui a déjà un devis
    est franchi *deux fois*. Retirer le jalon écrirait bien en base, mais le
    cran resterait vert — un bouton qui ne retire rien, et deux écrans de la
    même affaire qui se contredisent.
  */
  const parLeFait = point.state === "done" && (point.byFact || marked === null);
  // L'acompte et le solde vivent sur le devis. Sans devis, il n'y a pas où
  // écrire, et le dire vaut mieux qu'un bouton qui échoue.
  const sansDevis = write.target === "quote" && !edit.hasQuote;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group/cran focus-visible:ring-ring shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:outline-none"
          aria-label={`${entry.label} — ${point.detail}`}
        >
          <Dot state={point.state} compact={compact} interactive />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72" align="start">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">{entry.label}</p>
            <p className="text-muted-foreground text-xs">{entry.hint}</p>
          </div>

          <p className="text-xs">{point.detail}</p>

          {write.target === "worksite_date" && !parLeFait ? (
            <DateCran
              // La resynchronisation du brouillon est explicite : sans cette
              // clé, elle ne tiendrait qu'au démontage du contenu du Popover
              // par Radix, qui n'est pas une promesse de son API.
              key={marked ?? "vide"}
              value={marked}
              pending={edit.pending}
              onPick={async (at) => {
                await edit.onMark(point.step, at);
                setOpen(false);
              }}
            />
          ) : (
            <p className="text-muted-foreground/70 text-[11px]">
              {parLeFait
                ? "Déjà franchi par ce que porte l'affaire — un devis, un échange, une étape. Rien à retirer ici."
                : sansDevis
                  ? `${write.note} Cette affaire n'en porte aucun.`
                  : write.note}
            </p>
          )}

          {!parLeFait && write.target !== "worksite_date" && (
            <div className="flex items-center justify-end gap-2">
              {marked !== null && (
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={edit.pending}
                  onClick={async () => {
                    await edit.onMark(point.step, null);
                    setOpen(false);
                  }}
                >
                  Retirer
                </Button>
              )}
              {sansDevis ? (
                <Button
                  size="xs"
                  disabled={edit.pending}
                  onClick={() => {
                    edit.onAddQuote();
                    setOpen(false);
                  }}
                >
                  Nouveau devis
                </Button>
              ) : (
                marked === null && (
                  <Button
                    size="xs"
                    disabled={edit.pending}
                    onClick={async () => {
                      await edit.onMark(point.step, new Date().toISOString());
                      setOpen(false);
                    }}
                  >
                    Marquer franchi
                  </Button>
                )
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Le cran qui se choisit au lieu de se cocher.
 *
 * Une date de chantier se réserve pour dans six semaines : poser la date du
 * jour d'un clic serait faux neuf fois sur dix.
 */
function DateCran({
  value,
  pending,
  onPick,
}: {
  value: string | null;
  pending?: boolean;
  onPick: (at: string | null) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(() => value?.slice(0, 10) ?? lundiProchain());

  return (
    <div className="flex flex-col gap-3">
      <DateField label="Date de démarrage" value={draft} onChange={setDraft} />
      <p className="text-muted-foreground/70 text-[11px]">
        Écrit la date de démarrage de l&apos;affaire, celle que lit l&apos;écran
        Chantiers.
      </p>
      <div className="flex items-center justify-end gap-2">
        {value !== null && (
          <Button size="xs" variant="ghost" disabled={pending} onClick={() => onPick(null)}>
            Retirer
          </Button>
        )}
        <Button
          size="xs"
          disabled={pending || draft === ""}
          onClick={() => onPick(new Date(`${draft}T08:00:00`).toISOString())}
        >
          {value ? "Changer" : "Réserver"}
        </Button>
      </div>
    </div>
  );
}

/** Un chantier démarre un lundi. C'est le défaut le moins surprenant. */
function lundiProchain(): string {
  const at = new Date();
  at.setDate(at.getDate() + ((8 - at.getDay()) % 7 || 7));
  return at.toISOString().slice(0, 10);
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
