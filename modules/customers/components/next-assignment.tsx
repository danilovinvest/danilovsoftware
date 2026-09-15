"use client";

import { useState } from "react";
import Link from "next/link";
import { UserCheckIcon, UserPlusIcon } from "lucide-react";
import { useAuth } from "@/modules/auth";
import { TaskDialog } from "@/modules/tasks";
import { Button } from "@/components/ui/button";
import { useColleagues } from "@/shared/hooks/use-colleagues";
import { ErrorNotice } from "@/shared/ui/feedback";
import { formatDate } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import { useAction } from "../hooks/use-customers";
import type { CycleStep, NextAction } from "../lib/cycle";
import type { Project } from "../lib/types";

/** Les crans où c'est l'ingénieur qui agit, et celui du dessinateur. */
const ENGINEER_STEPS: CycleStep[] = ["calcul", "rapport", "redaction", "envoi", "sondage", "rapport_sondage"];
const DRAFTER_STEPS: CycleStep[] = ["dossier"];

/**
 * La prochaine action, et qui la porte.
 *
 * « À faire maintenant » disait quoi faire, jamais par qui ni pour quand. Le
 * cahier des charges veut l'intitulé, le responsable, l'échéance et la priorité
 * — et « un dossier ne devrait jamais rester actif sans responsable ni prochaine
 * action ». Mesuré le 15/09 : aucune des 192 affaires actives n'avait l'un ou
 * l'autre.
 *
 * **La prochaine action assignée est une tâche.** Une tâche a déjà un
 * responsable, une échéance et une priorité, et les tâches automatiques créent
 * celle de l'étape suivante : tenir une seconde notion à côté aurait fait deux
 * listes de choses à faire. Le serveur sert la plus pressante des tâches
 * ouvertes de l'affaire ; sans elle, « Assigner » ouvre le formulaire de tâche
 * pré-rempli de l'étape en cours, de la bonne personne et de la deadline.
 */
export function ProjectNextAssignment({
  project,
  customerName,
  action,
  canWrite,
  onChanged,
}: {
  project: Project;
  customerName: string;
  action: NextAction;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const { account } = useAuth();
  const colleagues = useColleagues();
  const [assigning, setAssigning] = useState(false);
  const attribuer = useAction(() => api.setProjectManager(project.id, account?.id ?? null));
  const task = project.next_task;

  // La personne qui doit agir à cette étape, quand elle est nommée ; sinon le
  // responsable ; sinon soi-même, qui assigne.
  const suggested =
    (ENGINEER_STEPS.includes(action.step) && project.engineer_id) ||
    (DRAFTER_STEPS.includes(action.step) && project.drafter_id) ||
    project.manager_id ||
    account?.id ||
    null;
  const due = project.internal_deadline_at
    ? new Date(`${project.internal_deadline_at.slice(0, 10)}T17:00:00`).toISOString()
    : inDays(3);

  return (
    <div data-demo="next-assignment" className="flex flex-col gap-2">
      {attribuer.error && <ErrorNotice message={attribuer.error} />}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-dashed px-3 py-2 text-xs">
        {task ? (
          <>
            <UserCheckIcon className="text-success size-3.5 shrink-0" />
            <span className="min-w-0">
              <span className="font-medium">{task.title}</span>
              <span className="text-muted-foreground"> · {task.assignee_name || "sans responsable"}</span>
              {task.due_at && (
                <span className={cn(task.is_overdue ? "text-danger font-medium" : "text-muted-foreground")}>
                  {" "}
                  · {task.is_overdue ? "en retard depuis le" : "pour le"} {formatDate(task.due_at)}
                </span>
              )}
              {task.priority === "haute" && <span className="text-warning font-medium"> · priorité haute</span>}
            </span>
            <Link href="/tasks" className="text-muted-foreground hover:text-foreground ml-auto underline">
              Voir les tâches
            </Link>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">Prochaine action : personne n&apos;en est chargé.</span>
            {canWrite && (
              <Button size="xs" className="ml-auto" onClick={() => setAssigning(true)}>
                <UserPlusIcon />
                Assigner
              </Button>
            )}
          </>
        )}
        {canWrite && !project.manager_id && account && (
          <Button
            size="xs"
            variant="ghost"
            disabled={attribuer.pending}
            title="Cette affaire n'a pas de responsable"
            onClick={async () => {
              if ((await attribuer.run()) !== null) onChanged();
            }}
          >
            Sans responsable · M&apos;attribuer
          </Button>
        )}
      </div>

      {assigning && (
        <TaskDialog
          task={null}
          open={assigning}
          onOpenChange={setAssigning}
          onSaved={onChanged}
          defaultTarget={{ customer_id: project.customer_id, project_id: project.id }}
          defaultTargetName={customerName}
          colleagues={colleagues}
          preset={{
            title: action.title,
            body: action.detail,
            priority: action.alert ? "haute" : "normale",
            due_at: due,
            assignee_id: suggested,
          }}
        />
      )}
    </div>
  );
}

function inDays(days: number): string {
  const at = new Date();
  at.setDate(at.getDate() + days);
  at.setHours(17, 0, 0, 0);
  return at.toISOString();
}
