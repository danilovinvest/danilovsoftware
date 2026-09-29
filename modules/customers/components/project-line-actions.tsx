"use client";

import { ClaudeButton, projectContext } from "@/modules/assistant";
import { PROJECT_STAGE } from "../lib/labels";
import type { Metier } from "../lib/cycle";
import type { Project, Quote } from "../lib/types";
import { ProjectIssuerBadge } from "./project-header";
import { ProjectMenu } from "./project-menu";

/**
 * Ce qui se pose à droite de la ligne d'une affaire : sa société, Claude, et le
 * menu « … ». Trois éléments, un exemplaire de chacun — et visibles affaire
 * repliée, parce qu'on change de société ou qu'on archive sans avoir besoin de
 * relire la frise.
 *
 * Claude reste une icône, comme dans l'en-tête de la fiche : un même geste a la
 * même forme aux deux étages de l'écran.
 */
export function ProjectLineActions({
  project,
  metier,
  site,
  quotes,
  interactionsCount,
  canWrite,
  canWriteQuotes,
  onIssuer,
  onEdit,
  onAddQuote,
  onClose,
  onArchive,
  onDelete,
}: {
  project: Project;
  metier: Metier;
  site: string;
  quotes: Quote[];
  interactionsCount: number;
  canWrite: boolean;
  canWriteQuotes: boolean;
  onIssuer: () => void;
  onEdit: () => void;
  onAddQuote: () => void;
  onClose: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <ProjectIssuerBadge project={project} metier={metier} canWrite={canWrite} onClick={onIssuer} />
      <ClaudeButton
        size="xs"
        iconOnly
        context={projectContext({
          label: project.label,
          stage: PROJECT_STAGE[project.stage].label,
          site,
          quotes: quotes.length,
          documents: quotes.filter((quote) => quote.drive_url).length,
          interactions: interactionsCount,
        })}
      />
      <ProjectMenu
        project={project}
        metier={metier}
        canWrite={canWrite}
        canWriteQuotes={canWriteQuotes}
        onEdit={onEdit}
        onAddQuote={onAddQuote}
        onClose={onClose}
        onArchive={onArchive}
        onDelete={onDelete}
      />
    </>
  );
}
