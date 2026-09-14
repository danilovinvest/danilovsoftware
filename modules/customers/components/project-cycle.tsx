"use client";

import { useState } from "react";
import { CheckIcon, PauseIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateField } from "@/shared/ui/date-time-field";
import { cn } from "@/lib/utils";
import { DepositEditor, type DepositTotal } from "./deposit-field";
import { MaterialsEditor } from "./materials-field";
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
  /**
   * Ce qui a déjà été commandé, pour le cran des matériaux.
   *
   * Il porte une liste et pas seulement une date : c'est le seul cran dont le
   * panneau fait saisir autre chose qu'un instant.
   */
  materials: string[];
  /**
   * Enregistre la commande et sa date. `null` retire les deux.
   *
   * Rend la réussite de l'écriture : le panneau ne se ferme que sur un succès,
   * faute de quoi un brouillon de plusieurs lignes disparaîtrait sans un mot.
   */
  onMaterials: (list: string[] | null) => boolean | Promise<boolean>;
  /**
   * L'acompte du devis qui porte le règlement : ce qu'il vaut, et à quoi il se
   * compare. Encaisser, c'est dire combien.
   */
  deposit: { amount: string | null; total: DepositTotal | null };
  /** Encaisse avec ce montant, ou le corrige. Rend la réussite. */
  onDeposit: (amount: string | null) => boolean | Promise<boolean>;
  /** Retire l'encaissement. Rend la réussite : le panneau reste ouvert sur un échec. */
  onDepositRemove: () => boolean | Promise<boolean>;
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
              <StepDot point={point} edit={edit} compact={compact} />
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
            {CYCLE_LABEL[point.step].label}
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
  /*
    Deux crans ne se cochent pas, ils se saisissent : la date de chantier se
    réserve pour dans six semaines, et les matériaux se listent. Leur panneau
    porte donc ses propres boutons, et non le « Marquer franchi » commun.
  */
  // L'acompte aussi se saisit, dès qu'un devis le porte : on dit combien.
  const acompte = write.target === "quote" && write.field === "deposit" && edit.hasQuote;
  const saisi = write.target === "worksite_date" || write.target === "materials" || acompte;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          /*
            Le cran entier, libellé compris.

            `select-none` parce qu'un clic sur un mot sélectionnait le mot au
            lieu d'ouvrir le panneau — c'est ce qu'on a vu à l'écran, et c'est
            ce qui donnait l'impression qu'on ne pouvait pas sauter d'étape.
          */
          className="group/cran focus-visible:ring-ring flex min-w-0 cursor-pointer flex-col items-start rounded-md text-left select-none focus-visible:ring-2 focus-visible:outline-none"
          aria-label={`${entry.label} — ${point.detail}`}
        >
          <Cran point={point} compact={compact} />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72" align="start">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">{entry.label}</p>
            <p className="text-muted-foreground text-xs">{entry.hint}</p>
          </div>

          <p className="text-xs">{point.detail}</p>

          {saisi && !parLeFait ? (
            write.target === "materials" ? (
              <MaterialsEditor
                // Même raison que pour la date : la resynchronisation du
                // brouillon est explicite, et ne tient pas au démontage du
                // contenu par Radix, qui n'est pas une promesse de son API.
                key={`${marked ?? "vide"}·${edit.materials.join("|")}`}
                value={edit.materials}
                marked={marked}
                pending={edit.pending}
                note={write.note}
                onSave={(list) => edit.onMaterials(list)}
                onRemove={() => edit.onMaterials(null)}
                onClose={() => setOpen(false)}
              />
            ) : acompte ? (
              <DepositEditor
                key={`${marked ?? "vide"}·${edit.deposit.amount ?? "vide"}`}
                amount={edit.deposit.amount}
                paid={marked !== null}
                total={edit.deposit.total}
                pending={edit.pending}
                onSave={edit.onDeposit}
                onRemove={edit.onDepositRemove}
                onClose={() => setOpen(false)}
              />
            ) : (
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
            )
          ) : (
            <p className="text-muted-foreground/70 text-[11px]">
              {parLeFait
                ? "Déjà franchi par ce que porte l'affaire — un devis, un échange, une étape. Rien à retirer ici."
                : sansDevis
                  ? `${write.note} Cette affaire n'en porte aucun.`
                  : write.note}
            </p>
          )}

          {!parLeFait && !saisi && (
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
