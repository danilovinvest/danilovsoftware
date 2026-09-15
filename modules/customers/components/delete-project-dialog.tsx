"use client";

import { useEffect, useState } from "react";
import { AlertTriangleIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessage } from "@/shared/api/errors";
import { ErrorNotice } from "@/shared/ui/feedback";
import { plural } from "@/shared/lib/format";
import * as api from "../lib/api";
import { useAction } from "../hooks/use-customers";
import type { Project, ProjectDeletion } from "../lib/types";

/**
 * Supprimer une affaire, en deux confirmations.
 *
 * Demandé ainsi : un double bouton. Le premier écran **dit ce qui part** — les
 * devis, les factures, les preuves, les jalons — et ce qui reste, parce qu'on
 * ne mesure pas une suppression à son intitulé. Le second ne dit qu'une chose :
 * c'est définitif. Deux gestes distincts, pour qu'un clic de trop ne suffise
 * jamais.
 *
 * Le dossier OneDrive n'est pas touché — le CRM n'y supprime rien — et la copie
 * ne recréera pas l'affaire à partir de lui : le serveur retient que ce dossier
 * a été écarté.
 */
export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onDeleted,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <Steps project={project} onCancel={() => onOpenChange(false)} onDeleted={onDeleted} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Steps({
  project,
  onCancel,
  onDeleted,
}: {
  project: Project;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [impact, setImpact] = useState<{ data: ProjectDeletion | null; error: string | null } | null>(
    null,
  );
  const remove = useAction(() => api.deleteProject(project.id));

  useEffect(() => {
    const controller = new AbortController();
    api
      .getProjectDeletion(project.id, controller.signal)
      .then((data) => setImpact({ data, error: null }))
      .catch((cause) => {
        if (!controller.signal.aborted) setImpact({ data: null, error: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [project.id]);

  const data = impact?.data ?? null;

  if (step === 1) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Supprimer l&apos;affaire « {project.label} » ?</DialogTitle>
          <DialogDescription>Voici ce que la suppression emporte, et ce qu&apos;elle garde.</DialogDescription>
        </DialogHeader>

        {impact?.error && <ErrorNotice message={impact.error} />}
        {!impact && <p className="text-muted-foreground text-sm">Inventaire de l&apos;affaire…</p>}

        {data && (
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <p className="text-danger mb-1 text-xs font-semibold tracking-wide uppercase">Part avec elle</p>
              <ul className="flex list-disc flex-col gap-0.5 pl-5">
                <li>{plural(data.quotes, "devis", "devis")}</li>
                {data.invoices.length > 0 && <li>Les factures {data.invoices.join(", ")}</li>}
                {data.proofs > 0 && <li>{plural(data.proofs, "preuve")} jointes aux crans</li>}
                {data.milestones && <li>Les jalons et les crans cochés</li>}
                {data.realisation && <li>L&apos;article de réalisation</li>}
                {data.tasks > 0 && <li>Le rattachement de {plural(data.tasks, "tâche")}</li>}
              </ul>
            </div>
            <div>
              <p className="text-success mb-1 text-xs font-semibold tracking-wide uppercase">Reste</p>
              <ul className="text-muted-foreground flex list-disc flex-col gap-0.5 pl-5">
                <li>La fiche client</li>
                {data.interactions_kept > 0 && <li>{plural(data.interactions_kept, "échange")}, détachés</li>}
                {data.events_kept > 0 && <li>{plural(data.events_kept, "rendez-vous", "rendez-vous")}, détachés</li>}
                {data.drive_path && (
                  <li>
                    Le dossier OneDrive, intact — la copie ne recréera pas l&apos;affaire
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button variant="destructive" disabled={!data} onClick={() => setStep(2)}>
            Continuer
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-danger flex items-center gap-2">
          <AlertTriangleIcon className="size-5" />
          Dernière confirmation
        </DialogTitle>
        <DialogDescription>
          L&apos;affaire « {project.label} » et ce qu&apos;elle porte seront supprimés
          définitivement. Cette suppression ne se rattrape pas.
        </DialogDescription>
      </DialogHeader>

      {remove.error && <ErrorNotice message={remove.error} />}

      <DialogFooter>
        <Button variant="outline" onClick={() => setStep(1)} disabled={remove.pending}>
          Retour
        </Button>
        <Button
          variant="destructive"
          disabled={remove.pending}
          onClick={async () => {
            // 204 sans corps rend `undefined` : seul `null` dit l'échec.
            if ((await remove.run()) === null) return;
            onDeleted();
          }}
        >
          <Trash2Icon />
          Supprimer définitivement
        </Button>
      </DialogFooter>
    </>
  );
}
