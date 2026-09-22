"use client";

import { useState } from "react";
import { useDirtyGuard } from "@/shared/lib/dirty-guard";
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
import { SIZE_ORDER, TASK_PRIORITY, TASK_SIZE, TASK_STATUS, toOptions } from "../lib/labels";
import { TaskTargetField } from "./task-target-field";
import type {
  Colleague,
  Task,
  TaskPayload,
  TaskPriority,
  TaskSize,
  TaskStatus,
  TaskTargetPayload,
} from "../lib/types";

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
  /**
   * Ce que la tâche propose à sa création : la prochaine action d'une affaire
   * arrive avec son intitulé, sa priorité, son échéance et la personne qui doit
   * agir. Tout reste modifiable avant d'enregistrer.
   */
  preset,
  colleagues = [],
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  defaultTarget?: TaskTargetPayload;
  defaultTargetName?: string;
  initialStatus?: TaskStatus;
  preset?: {
    title?: string;
    body?: string;
    priority?: TaskPriority;
    due_at?: string | null;
    assignee_id?: string | null;
  };
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

  const [title, setTitle] = useState(task?.title ?? preset?.title ?? "");
  const [customerId, setCustomerId] = useState<string | null>(
    cibleFiche?.customer_id ?? cibleAffaire?.owner_id ?? defaultTarget?.customer_id ?? null,
  );
  const [customerName, setCustomerName] = useState(
    cibleFiche?.label ?? cibleAffaire?.owner_name ?? defaultTargetName,
  );
  const [projectId, setProjectId] = useState<string | null>(
    cibleAffaire?.project_id ?? defaultTarget?.project_id ?? null,
  );
  const [body, setBody] = useState(task?.body ?? preset?.body ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? initialStatus ?? "a_faire");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? preset?.priority ?? "normale",
  );
  // Nulle par défaut : une tâche qu'on vient de saisir n'est pas estimée, et la
  // poser à « Regular » d'office ferait passer pour mesuré ce qui est ignoré.
  const [taskSize, setTaskSize] = useState<TaskSize | null>(task?.size ?? null);
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? preset?.assignee_id ?? "");
  const [dueAt, setDueAt] = useState<string | null>(task?.due_at ?? preset?.due_at ?? null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  // Ce que la boîte contenait à l'ouverture : l'écart dit qu'une saisie est en cours.
  const saisie = JSON.stringify([title, customerId, projectId, body, status, priority, taskSize, assigneeId, dueAt]);
  const [ouverture] = useState(saisie);
  const close = useDirtyGuard(saisie !== ouverture, onOpenChange);

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
      priority,
      size: taskSize,
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
    <Dialog open={open} onOpenChange={close}>
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
          {/*
            L'urgence à côté du statut, et non sous le titre : les deux disent
            où en est la tâche, l'un dans le temps, l'autre dans l'ordre de
            passage. Les lire ensemble évite de les chercher séparément.
          */}
          <SelectField
            label="Priorité"
            options={toOptions(TASK_PRIORITY)}
            value={priority}
            onValueChange={(value) => setPriority(value as TaskPriority)}
          />
          {/*
            La taille, comme sur un tableau GitHub Projects — et facultative.
            « Non estimée » est un choix qui se relit : une tâche sans taille
            n'est pas une tâche moyenne.
          */}
          <SelectField
            // `SelectField` ne transmet pas d'attribut libre : c'est son `id`
            // qui sert de prise à la démo, comme ailleurs dans le CRM.
            id="task-size-field"
            label="Taille"
            placeholder="Non estimée"
            emptyLabel="Non estimée"
            options={SIZE_ORDER.map((value) => ({
              value,
              label: `${TASK_SIZE[value].icon} ${TASK_SIZE[value].label}`,
            }))}
            value={taskSize ?? ""}
            onValueChange={(value) => setTaskSize((value as TaskSize) || null)}
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
          <Button variant="outline" onClick={() => close(false)}>
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
