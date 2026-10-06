"use client";

import type { ReactNode } from "react";
import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { TONE_SOFT } from "@/shared/ui/panel";
import { formatAmount, formatDate } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { projectReference, type Deadline } from "../lib/mission";
import { PROJECT_MISSION } from "../lib/labels";
import type { CyclePoint, Metier, NextAction } from "../lib/cycle";
import type { Project, ProjectMission } from "../lib/types";
import { ProjectCycle } from "./project-cycle";

/**
 * Les deux bornes du chantier, dites en une phrase.
 *
 * Trois cas, et aucun ne se confond : « du 3 au 17 juin » quand tout est connu,
 * « depuis le 3 juin » quand il a commencé sans finir, « terminé le 17 juin »
 * quand seule la fin est saisie — ce qui arrive sur une affaire reprise. Vide
 * quand aucune date n'existe : une mention « — · — » n'apprendrait rien et
 * pousserait le nom du responsable hors de la ligne.
 */
function periodeChantier(started: string | null, finished: string | null): string {
  if (started && finished) return `du ${formatDate(started)} au ${formatDate(finished)}`;
  if (started) return `depuis le ${formatDate(started)}`;
  if (finished) return `terminé le ${formatDate(finished)}`;
  return "";
}

/**
 * La ligne d'une affaire, repliée comme dépliée.
 *
 * Repliée, elle répond seule à « où en est-on » : le numéro, l'intitulé, le
 * délai, la frise, la prochaine action, le montant. Le reste — mission,
 * sondage, adresse, période, responsable — descend sur une seconde ligne, en
 * gris : on le cherche, on ne le lit pas d'abord.
 *
 * Le texte déplie l'affaire ; la société, Claude et le menu « … » vivent à
 * droite, **hors** du bouton : un bouton dans un bouton est invalide, et le
 * clic déplierait l'affaire au lieu d'agir. L'étape n'y est plus en pastille :
 * la frise la dit déjà, cran par cran.
 */
export function ProjectHeader({
  project,
  metier,
  mission,
  echeance,
  survey,
  site,
  points,
  action,
  open,
  actions,
}: {
  project: Project;
  metier: Metier;
  mission: ProjectMission;
  echeance: Deadline | null;
  /** L'affaire porte-t-elle un sondage ? */
  survey: boolean;
  site: string;
  points: CyclePoint[];
  action: NextAction;
  open: boolean;
  /** La société, Claude et le menu, à droite de la ligne. */
  actions: ReactNode;
}) {
  const periode = periodeChantier(project.started_at, project.finished_at);
  const secondaire = [
    metier === "etudes" ? PROJECT_MISSION[mission].label : null,
    survey ? "sondage" : null,
  ].filter(Boolean);

  return (
    <div
      data-demo="project-line"
      className="hover:bg-muted/30 flex items-center gap-2 pr-3 transition-colors"
    >
      <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left">
        <ChevronRightIcon
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Le numéro qu'on dicte au téléphone et qu'on écrit sur un plan. */}
            {project.reference && (
              <span
                data-demo="project-reference"
                className="text-muted-foreground font-mono text-[11px] font-semibold"
              >
                {projectReference(project.reference, metier)}
              </span>
            )}
            <span className="truncate text-sm font-medium">{project.label}</span>
            {echeance && (
              <span
                data-demo="project-deadline"
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium",
                  TONE_SOFT[echeance.tone],
                )}
              >
                {echeance.label}
              </span>
            )}
          </div>
          <div className="text-muted-foreground truncate text-xs">
            {secondaire.length > 0 && (
              <span data-demo="project-mission">{secondaire.join(" · ")} · </span>
            )}
            {site || "Chantier non renseigné"}
            {periode && <span data-demo="project-periode"> · {periode}</span>}
            {project.manager_name && ` · ${project.manager_name}`}
            {/* Le payeur quand ce n'est pas la fiche (migration 107) : c'est
                de lui que l'argent arrive, et c'est sa fiche qu'on rappelle. */}
            {project.payer_name && (
              <span data-demo="project-payer-line" className="text-foreground">
                {" "}
                · payé par {project.payer_name}
              </span>
            )}
          </div>
        </div>

        <ProjectCycle points={points} size="mini" className="hidden shrink-0 sm:inline-flex" />

        <span
          className={cn(
            "hidden max-w-48 shrink-0 truncate rounded-md px-1.5 py-0.5 text-[0.7rem] whitespace-nowrap md:inline-block",
            action.alert ? TONE_SOFT[action.tone] : "text-muted-foreground",
          )}
        >
          {action.title}
        </span>

        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {project.total_amount_ttc === "0" ? "—" : formatAmount(project.total_amount_ttc)}
        </span>
      </CollapsibleTrigger>

      <div className="flex shrink-0 items-center gap-1">{actions}</div>
    </div>
  );
}

/**
 * La société de l'affaire, et le seul endroit où elle se change.
 *
 * Elle se lit autant qu'elle se clique : « GROUPE · déduite » dit à qui est
 * l'affaire sans rien ouvrir. Elle était aussi dans le menu, sous un autre nom
 * — deux portes pour un même geste, dont une qu'on ne voyait pas.
 */
export function ProjectIssuerBadge({
  project,
  metier,
  canWrite,
  onClick,
}: {
  project: Project;
  metier: Metier;
  canWrite: boolean;
  onClick: () => void;
}) {
  const label = (
    <>
      {metier === "etudes" ? "STRUCTURE" : "GROUPE"}
      {!project.issuer && <span className="font-normal">· déduite</span>}
    </>
  );
  if (!canWrite) {
    return (
      <span className="text-muted-foreground hidden px-2 text-[0.7rem] font-medium sm:inline">
        {label}
      </span>
    );
  }
  return (
    <Button
      size="xs"
      variant="outline"
      data-demo="project-issuer"
      className="text-muted-foreground text-[0.7rem]"
      title="Basculer l'affaire vers l'autre société"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
