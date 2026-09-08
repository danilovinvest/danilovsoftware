"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { DateTimeField } from "@/shared/ui/date-time-field";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import { TASK_STATUS, toOptions } from "../lib/labels";
import { TaskTargetField } from "./task-target-field";
import type { Colleague, Task, TaskPayload, TaskStatus, TaskTargetPayload } from "../lib/types";

export function TaskDialog({
  task,
  open,
  onOpenChange,
  onSaved,
  /**
   * Cible proposée : la tâche créée depuis une fiche y arrive rattachée.
   *
   * Proposée et non imposée — on peut s'être trompé d'écran, et verrouiller le
   * champ obligerait à supprimer la tâche pour la refaire ailleurs.
   */
  defaultTarget,
  /** Le nom de la fiche proposée, pour l'afficher sans la redemander. */
  defaultTargetName = "",
  /** Colonne d'origine quand on crée depuis le tableau. */
  initialStatus,
  colleagues = [],
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  defaultTarget?: TaskTargetPayload;
  defaultTargetName?: string;
  initialStatus?: TaskStatus;
  colleagues?: Colleague[];
}) {
  /*
   * Le rattachement, lu des cibles existantes.
   *
   * Une cible « affaire » ne porte pas son client — la contrainte SQL veut
   * exactement l'un des deux — mais le serveur renvoie `owner_id` : c'est lui
   * qui permet de rouvrir une tâche de chantier avec la bonne fiche déjà
   * choisie et la bonne affaire sélectionnée.
   */
  const cibleFiche = task?.targets.find((t) => t.customer_id) ?? null;
  const cibleAffaire = task?.targets.find((t) => t.project_id) ?? null;

  const [title, setTitle] = useState(task?.title ?? "");
  const [customerId, setCustomerId] = useState<string | null>(
    cibleFiche?.customer_id ?? cibleAffaire?.owner_id ?? defaultTarget?.customer_id ?? null,
  );
  const [customerName, setCustomerName] = useState(
    cibleFiche?.label ?? cibleAffaire?.owner_name ?? defaultTargetName,
  );
  const [projectId, setProjectId] = useState<string | null>(
    cibleAffaire?.project_id ?? defaultTarget?.project_id ?? null,
  );
  const [body, setBody] = useState(task?.body ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? initialStatus ?? "a_faire");
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? "");
  const [dueAt, setDueAt] = useState<string | null>(task?.due_at ?? null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFields({});

    /*
     * Une seule cible, la plus précise des deux.
     *
     * Rattacher une tâche à la fois à la fiche et à l'affaire écrirait deux
     * lignes qui disent la même chose, et l'écran l'afficherait deux fois. Une
     * affaire suffit à retrouver son client — c'est ce que fait `owner_id` — et
     * le filtre par fiche prend désormais les deux branches.
     */
    const targets: TaskTargetPayload[] = projectId
      ? [{ project_id: projectId }]
      : customerId
        ? [{ customer_id: customerId }]
        : [];

    const payload: TaskPayload = {
      title,
      body,
      status,
      due_at: dueAt,
      assignee_id: assigneeId || null,
      targets,
    };

    try {
      if (task) await api.updateTask(task.id, payload);
      else await api.createTask(payload);
      onOpenChange(false);
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
      if (cause && typeof cause === "object" && "fields" in cause) {
        setFields((cause as { fields: Record<string, string> }).fields);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{task ? "Modifier la tâche" : "Nouvelle tâche"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Ce qu'il faut faire, pour qui, et pour quand."
              : defaultTarget
                ? "Elle arrive rattachée à la fiche ouverte ; le rattachement reste modifiable."
                : "Rattachez-la à un client pour la retrouver depuis sa fiche."}
          </DialogDescription>
        </DialogHeader>

        {/* Une date a besoin de plus de place qu'un statut : « jeu. 10 sept. ·
            9h » ne tient pas dans la moitié d'une boîte de dialogue, « À
            faire » y flotte. D'où deux colonnes inégales plutôt que deux
            moitiés. */}
        <form
          id="task-form"
          onSubmit={submit}
          className="grid gap-4 sm:grid-cols-[minmax(0,7rem)_minmax(0,1fr)]"
        >
          {error && !Object.keys(fields).length && (
            <div className="sm:col-span-2">
              <ErrorNotice message={error} />
            </div>
          )}

          <TextField
            label="Intitulé"
            required
            autoFocus
            wrapperClassName="sm:col-span-2"
            placeholder="Ex. Relancer pour les plans de l'architecte"
            value={title}
            error={fields.title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <SelectField
            label="Statut"
            options={toOptions(TASK_STATUS)}
            value={status}
            error={fields.status}
            onValueChange={(value) => setStatus(value as TaskStatus)}
          />
          <DateTimeField label="Échéance" value={dueAt} onChange={setDueAt} />
          <SelectField
            label="Assignée à"
            wrapperClassName="sm:col-span-2"
            placeholder="Personne"
            emptyLabel="Personne"
            options={colleagues.map((c) => ({
              value: c.id,
              label: c.name || "Sans nom",
            }))}
            value={assigneeId}
            error={fields.assignee_id}
            onValueChange={setAssigneeId}
          />
          <TextAreaField
            label="Détails"
            wrapperClassName="sm:col-span-2"
            className="min-h-24"
            placeholder="Ce qu'il faut faire, et pourquoi."
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />

          {/* Le rattachement en dernier et séparé d'un trait : c'est ce qui
              range la tâche, pas ce qui la décrit. L'intitulé et l'échéance
              se saisissent à chaque fois ; celui-ci, souvent, est déjà posé. */}
          <div className="flex flex-col gap-3 border-t pt-4 sm:col-span-2">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Rattachement
            </p>
            <TaskTargetField
              customerId={customerId}
              customerName={customerName}
              projectId={projectId}
              onChange={(next) => {
                setCustomerId(next.customerId);
                setCustomerName(next.customerName);
                setProjectId(next.projectId);
              }}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button form="task-form" type="submit" disabled={pending}>
            {task ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
