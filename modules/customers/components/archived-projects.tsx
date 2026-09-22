"use client";

import { useState } from "react";
import { ArchiveIcon, ArchiveRestoreIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ErrorNotice } from "@/shared/ui/feedback";
import { formatDate } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { PROJECT_STAGE } from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import * as api from "../lib/api";
import type { Project } from "../lib/types";
import { EnumBadge } from "./enum-badge";

/**
 * Les affaires archivées d'une fiche, repliées sous les autres (issue 115).
 *
 * Archiver range, ça n'efface pas : l'affaire sort des listes de travail et
 * reste ici, avec son étape et ses devis intacts. Repliée par défaut, parce
 * qu'une affaire rangée n'a rien à demander — sauf quand un lien la désigne,
 * auquel cas on vient justement la voir. Une ligne par affaire et non son
 * accordéon complet : on ne travaille pas une affaire archivée, on la
 * désarchive d'abord.
 */
export function ArchivedProjects({
  projects,
  focusId,
  canWrite,
  onChanged,
}: {
  projects: Project[];
  /** L'affaire désignée par l'adresse : si elle est ici, la section s'ouvre. */
  focusId: string | null;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(() => projects.some((project) => project.id === focusId));
  const restore = useAction((id: string) => api.setProjectArchived(id, false), { inline: true });

  if (projects.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} data-demo="projects-archived">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium"
        >
          <ChevronRightIcon className={cn("size-3.5 transition-transform", open && "rotate-90")} />
          <ArchiveIcon className="size-3.5" />
          Affaires archivées
          <span className="text-muted-foreground/70">{projects.length}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="bg-card mt-2 divide-y rounded-xl border">
          {projects.map((project) => (
            <li
              key={project.id}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5",
                project.id === focusId && "bg-muted/50",
              )}
            >
              {project.reference && (
                <span className="font-mono text-xs">{project.reference}</span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm">{project.label}</span>
              <EnumBadge value={project.stage} entries={PROJECT_STAGE} />
              <span className="text-muted-foreground text-xs">
                archivée le {formatDate(project.archived_at)}
              </span>
              {canWrite && (
                <Button
                  size="xs"
                  variant="outline"
                  data-demo="project-unarchive"
                  disabled={restore.pending}
                  onClick={async () => {
                    if ((await restore.run(project.id)) !== null) onChanged();
                  }}
                >
                  <ArchiveRestoreIcon />
                  Désarchiver
                </Button>
              )}
            </li>
          ))}
        </ul>
        {restore.error && <ErrorNotice message={restore.error} />}
      </CollapsibleContent>
    </Collapsible>
  );
}
