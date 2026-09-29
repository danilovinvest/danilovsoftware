"use client";

import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  CheckCircle2Icon,
  EllipsisIcon,
  FilePlusIcon,
  HardHatIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
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
import { formatDate } from "@/shared/lib/format";
import type { Metier } from "../lib/cycle";
import type { Project } from "../lib/types";

/**
 * Tous les gestes d'une affaire, dans un seul menu « … » posé sur sa ligne.
 *
 * Ils étaient répartis entre une barre à droite des onglets — étape, société,
 * Claude, « Devis », « Modifier » — et un menu qui répétait « Changer de
 * société » et « Ouvrir dans Chantiers » que la ligne offrait déjà. Il n'en
 * reste qu'un exemplaire de chacun : la société se change par son badge, sur la
 * ligne, parce qu'elle s'y lit ; Claude reste une icône à côté de ce menu,
 * comme dans l'en-tête de la fiche ; tout le reste vit ici, « Supprimer » seul,
 * en rouge, sous un filet.
 */
export function ProjectMenu({
  project,
  metier,
  canWrite,
  canWriteQuotes,
  onEdit,
  onAddQuote,
  onClose,
  onArchive,
  onDelete,
}: {
  project: Project;
  metier: Metier;
  canWrite: boolean;
  canWriteQuotes: boolean;
  onEdit: () => void;
  onAddQuote: () => void;
  /** Termine le chantier — ou le rouvre s'il porte déjà une date de fin. */
  onClose: () => void;
  /** Range l'affaire : elle sort des listes de travail et reste sur la fiche. */
  onArchive: () => void;
  onDelete: () => void;
}) {
  const signee = project.stage === "gagne" || project.stage === "realise";
  if (!signee && !canWrite && !canWriteQuotes) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/*
          Le repère « project-delete » reste sur le déclencheur : les démos
          l'ouvrent pour montrer chacune de ses entrées.
        */}
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Actions sur l'affaire"
          data-demo="project-delete"
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-1.5">
        <DropdownMenuLabel className={MENU_LABEL}>Affaire</DropdownMenuLabel>
        {canWrite && (
          <DropdownMenuItem className={MENU_ITEM} data-demo="project-edit" onSelect={onEdit}>
            <MenuAction
              icon={<PencilIcon />}
              label="Modifier l'affaire…"
              hint="Intitulé, type, responsable, intervenants, délais"
            />
          </DropdownMenuItem>
        )}
        {canWriteQuotes && (
          <DropdownMenuItem className={MENU_ITEM} data-demo="project-new-quote" onSelect={onAddQuote}>
            <MenuAction icon={<FilePlusIcon />} label="Nouveau devis…" hint="Étude, sondage ou lot de travaux" />
          </DropdownMenuItem>
        )}
        <ExecutionItems
          project={project}
          metier={metier}
          canWrite={canWrite}
          signee={signee}
          onClose={onClose}
        />
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
  );
}

/**
 * Le côté exécution : ouvrir l'affaire dans Chantiers ou Études, la terminer ou
 * la rouvrir.
 *
 * Seulement une affaire signée : un chantier *est* une affaire d'étape `gagne`
 * ou `realise`, `GET /v1/worksites` ne sert que celles-là, et on ne
 * réceptionne pas un devis qui n'a pas été accepté. L'entrée emmène
 * l'identifiant et suit le métier ; il n'y a pas de route `/chantiers/{id}` et
 * il n'en faut pas — une route dynamique ne s'exporte pas en statique, ce dont
 * l'application de bureau dépend.
 */
function ExecutionItems({
  project,
  metier,
  canWrite,
  signee,
  onClose,
}: {
  project: Project;
  metier: Metier;
  canWrite: boolean;
  signee: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  if (!signee) return null;
  const etude = metier === "etudes";
  return (
    <>
      <DropdownMenuItem
        className={MENU_ITEM}
        data-demo="project-worksite"
        onSelect={() => router.push(`${etude ? "/etudes" : "/chantiers"}?affaire=${project.id}`)}
      >
        <MenuAction
          icon={<HardHatIcon />}
          label={etude ? "Ouvrir dans Études" : "Ouvrir dans Chantiers"}
          hint={etude ? "Production, plans et rendus" : "Planning, matériaux et réception"}
        />
      </DropdownMenuItem>
      {/* La date de fin, le PV de réception et le solde en un geste. */}
      {canWrite && (
        <DropdownMenuItem className={MENU_ITEM} data-demo="project-closure-item" onSelect={onClose}>
          <MenuAction
            icon={project.finished_at ? <RotateCcwIcon /> : <CheckCircle2Icon />}
            label={
              project.finished_at
                ? "Rouvrir le chantier…"
                : etude
                  ? "Clôturer l'étude…"
                  : "Terminer le chantier…"
            }
            hint={
              project.finished_at
                ? `Terminé le ${formatDate(project.finished_at)}`
                : "Date de fin, PV de réception et solde"
            }
          />
        </DropdownMenuItem>
      )}
    </>
  );
}
