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
import type { Colleague, Task, TaskPayload, TaskStatus, TaskTargetPayload } from "../lib/types";

export function TaskDialog({
  task,
  open,
  onOpenChange,
  onSaved,
  /** Cible imposée : la tâche créée depuis une fiche y est rattachée d'office. */
  defaultTarget,
  /** Colonne d'origine quand on crée depuis le tableau. */
  initialStatus,
  colleagues = [],
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  defaultTarget?: TaskTargetPayload;
  initialStatus?: TaskStatus;
  colleagues?: Colleague[];
}) {
  const [title, setTitle] = useState(task?.title ?? "");
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

    // À la modification, on conserve les cibles existantes : la boîte de
    // dialogue ne les édite pas, elle ne doit pas les effacer.
    const targets: TaskTargetPayload[] = task
      ? task.targets.map((t) => ({ customer_id: t.customer_id, project_id: t.project_id }))
      : defaultTarget
        ? [defaultTarget]
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Modifier la tâche" : "Nouvelle tâche"}</DialogTitle>
          {!task && defaultTarget && (
            <DialogDescription>
              Elle sera rattachée à la fiche ouverte.
            </DialogDescription>
          )}
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
