"use client";

import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  ArrowLeftRightIcon,
  FilePlusIcon,
  HardHatIcon,
  EllipsisIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { ClaudeButton, projectContext } from "@/modules/assistant";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MENU_ITEM, MENU_ITEM_DANGER, MENU_LABEL, MenuAction } from "@/shared/ui/menu-action";
import { PROJECT_STAGE } from "../lib/labels";
import type { Metier } from "../lib/cycle";
import type { Project } from "../lib/types";
import { EnumBadge } from "./enum-badge";

/**
 * Les gestes d'une affaire, à droite de ses onglets.
 *
 * Il y en avait sept sur une rangée — Chantier, société, Claude, Devis,
 * Modifier, Supprimer — et « Supprimer » était le voisin immédiat de
 * « Modifier » : un clic de travers ouvrait la suppression. Il reste les deux
 * gestes qu'on fait tous les jours, **Devis** et **Modifier**, et un menu
 * « … » pour le reste, où « Supprimer » vit seul, en rouge, sous un filet.
 *
 * La société reste visible parce qu'elle se lit autant qu'elle se clique :
 * « GROUPE · déduite » dit à qui est l'affaire sans rien ouvrir.
 */
export function ProjectToolbar({
  project,
  metier,
  site,
  quotesCount,
  documentsCount,
  interactionsCount,
  canWrite,
  canWriteQuotes,
  onAddQuote,
  onEdit,
  onIssuer,
  onArchive,
  onDelete,
}: {
  project: Project;
  metier: Metier;
  site: string;
  quotesCount: number;
  documentsCount: number;
  interactionsCount: number;
  canWrite: boolean;
  canWriteQuotes: boolean;
  onAddQuote: () => void;
  onEdit: () => void;
  onIssuer: () => void;
  /** Range l'affaire : elle sort des listes de travail et reste sur la fiche. */
  onArchive: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const signee = project.stage === "gagne" || project.stage === "realise";
  const ecran = metier === "etudes" ? "/etudes" : "/chantiers";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <EnumBadge value={project.stage} entries={PROJECT_STAGE} />
      {canWrite && (
        <Button
          size="xs"
          variant="ghost"
          data-demo="project-issuer"
          className="text-muted-foreground"
          title="Basculer l'affaire vers l'autre société"
          onClick={onIssuer}
        >
          {metier === "etudes" ? "STRUCTURE" : "GROUPE"}
          {!project.issuer && <span className="font-normal">· déduite</span>}
        </Button>
      )}
      <ClaudeButton
        size="xs"
        iconOnly
        context={projectContext({
          label: project.label,
          stage: PROJECT_STAGE[project.stage].label,
          site,
          quotes: quotesCount,
          documents: documentsCount,
          interactions: interactionsCount,
        })}
      />
      {canWriteQuotes && (
        <Button size="xs" variant="outline" onClick={onAddQuote}>
          <FilePlusIcon />
          Devis
        </Button>
      )}
      {canWrite && (
        <Button
          size="xs"
          variant="outline"
          onClick={onEdit}
          title="Intitulé, type, responsable, intervenants"
          data-demo="project-edit"
        >
          <PencilIcon />
          Modifier
        </Button>
      )}
      {(signee || canWrite) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/*
              Le repère de démo « project-delete » est posé ici : la suppression
              vit désormais dans ce menu, fermé tant qu'on ne l'ouvre pas.
            */}
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Autres actions sur l'affaire"
              data-demo="project-delete"
            >
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-1.5">
            <DropdownMenuLabel className={MENU_LABEL}>
              Affaire
            </DropdownMenuLabel>
            {/*
              Ouvrir l'affaire côté exécution. Seulement une affaire signée : un
              chantier *est* une affaire d'étape `gagne` ou `realise`, et
              `GET /v1/worksites` ne sert que celles-là.
            */}
            {signee && (
              <DropdownMenuItem
                className={MENU_ITEM}
                data-demo="project-worksite"
                onSelect={() => router.push(`${ecran}?affaire=${project.id}`)}
              >
                <MenuAction
                  icon={<HardHatIcon />}
                  label={metier === "etudes" ? "Ouvrir dans Études" : "Ouvrir dans Chantiers"}
                  hint={metier === "etudes" ? "Production, plans et rendus" : "Planning, matériaux et réception"}
                />
              </DropdownMenuItem>
            )}
            {canWrite && (
              <DropdownMenuItem className={MENU_ITEM} onSelect={onIssuer}>
                <MenuAction
                  icon={<ArrowLeftRightIcon />}
                  label="Changer de société"
                  hint={`${metier === "etudes" ? "STRUCTURE" : "GROUPE"}${project.issuer ? "" : " (déduite des devis)"} → ${metier === "etudes" ? "GROUPE" : "STRUCTURE"}`}
                />
              </DropdownMenuItem>
            )}
            {/*
              Archiver avant supprimer, et hors du filet rouge : c'est le geste
              qu'on veut pour une affaire morte. Il ne retire rien, et se défait
              d'un clic depuis « Affaires archivées » (issue 115).
            */}
            {canWrite && (
              <DropdownMenuItem className={MENU_ITEM} data-demo="project-archive" onSelect={onArchive}>
                <MenuAction
                  icon={<ArchiveIcon />}
                  label="Archiver l'affaire…"
                  hint="Sort des listes de travail, reste sur la fiche"
                />
              </DropdownMenuItem>
            )}
            {canWrite && (
              <>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuItem
                  variant="destructive"
                  className={MENU_ITEM_DANGER}
                  data-demo="project-delete-item"
                  onSelect={onDelete}
                >
                  <MenuAction
                    icon={<Trash2Icon />}
                    label="Supprimer l'affaire…"
                    hint="Définitif : devis, factures et preuves compris"
                    danger
                  />
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
