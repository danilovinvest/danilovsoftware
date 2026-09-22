"use client";

import Link from "next/link";
import { ArrowUpRightIcon, ChevronRightIcon } from "lucide-react";
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
 * L'en-tête d'une affaire, replié comme déplié.
 *
 * Replié, il répond seul à « où en est-on » : la frise, l'attente, le montant.
 * C'est tout le bouton qui déplie l'affaire.
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
}) {
  const periode = periodeChantier(project.started_at, project.finished_at);

  return (
    <>
      <CollapsibleTrigger className="hover:bg-muted/30 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors">
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
            {metier === "etudes" && (
              <span
                data-demo="project-mission"
                className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]"
              >
                {PROJECT_MISSION[mission].label}
              </span>
            )}
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
            {survey && (
              <span className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]">
                sondage
              </span>
            )}
          </div>
          <div className="text-muted-foreground truncate text-xs">
            {site || "Chantier non renseigné"}
            {periode && <span data-demo="project-periode"> · {periode}</span>}
            {project.manager_name && ` · ${project.manager_name}`}
          </div>
        </div>

        <ProjectCycle points={points} size="mini" className="hidden shrink-0 sm:inline-flex" />

        <span
          className={cn(
            "hidden shrink-0 rounded-md px-1.5 py-0.5 text-[0.7rem] whitespace-nowrap md:inline-block",
            action.alert ? TONE_SOFT[action.tone] : "text-muted-foreground",
          )}
        >
          {action.title}
        </span>

        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {project.total_amount_ttc === "0" ? "—" : formatAmount(project.total_amount_ttc)}
        </span>
      </CollapsibleTrigger>

      {/*
        Le chemin vers le chantier, sous l'adresse et hors du bouton qui déplie
        l'affaire : un lien dans un bouton serait invalide, et le clic déplierait
        l'affaire au lieu de l'ouvrir.

        Seulement pour une affaire signée ou réalisée : les écrans Chantiers et
        Études ne listent que celles-là. Il emmène l'identifiant, et suit le
        métier — une étude va dans Études, des travaux dans Chantiers. Il n'y a
        pas de route `/chantiers/{id}` et il n'en faut pas : une route dynamique
        ne s'exporte pas en statique, ce dont l'application de bureau dépend.
      */}
      {(project.stage === "gagne" || project.stage === "realise") && (
        <div className="-mt-2 pb-2.5 pl-11">
          <Link
            href={`/${metier === "etudes" ? "etudes" : "chantiers"}?affaire=${project.id}`}
            data-demo="project-worksite-link"
            className="text-info inline-flex items-center gap-1 text-xs hover:underline"
          >
            {metier === "etudes" ? "Voir l'étude" : "Voir le chantier"}
            <ArrowUpRightIcon className="size-3" />
          </Link>
        </div>
      )}
    </>
  );
}
