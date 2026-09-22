"use client";

import { useState } from "react";
import { PencilIcon, StickyNoteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNotice } from "@/shared/ui/feedback";
import * as api from "../lib/api";
import { useAction } from "../hooks/use-customers";
import type { Project } from "../lib/types";

/**
 * Les notes de l'affaire, dans l'affaire dépliée (issue 83).
 *
 * `project.notes` existait en base et ne se lisait que dans la fiche latérale
 * d'un chantier : le contexte d'une affaire — accès, contraintes — s'écrivait
 * donc dans les notes de la fiche, mêlé à celui des autres affaires. Ici on le
 * lit et on le corrige sur place ; l'écriture n'envoie que `notes`, la route
 * de l'affaire gardant le reste.
 */
export function ProjectNotes({
  project,
  canWrite,
  onChanged,
}: {
  project: Project;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const save = useAction(
    (notes: string) => api.updateProject(project.id, { notes }),
    { inline: true },
  );

  if (draft !== null) {
    return (
      <div className="flex flex-col gap-2" data-demo="project-notes">
        {save.error && <ErrorNotice message={save.error} />}
        <Textarea
          autoFocus
          aria-label="Notes de l'affaire"
          placeholder="Accès, digicode, contraintes du chantier…"
          className="min-h-20 text-sm"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={save.pending}
            onClick={async () => {
              if ((await save.run(draft)) === null) return;
              setDraft(null);
              onChanged();
            }}
          >
            Enregistrer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  if (!project.notes) {
    if (!canWrite) return null;
    return (
      <button
        type="button"
        data-demo="project-notes"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-xs"
        onClick={() => setDraft("")}
      >
        <StickyNoteIcon className="size-3.5" />
        Ajouter une note à l’affaire
      </button>
    );
  }

  return (
    <div
      data-demo="project-notes"
      className="bg-muted/50 flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
    >
      <StickyNoteIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
      <p className="min-w-0 flex-1 whitespace-pre-line">{project.notes}</p>
      {canWrite && (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Modifier les notes de l'affaire"
          className="shrink-0"
          onClick={() => setDraft(project.notes)}
        >
          <PencilIcon />
        </Button>
      )}
    </div>
  );
}
