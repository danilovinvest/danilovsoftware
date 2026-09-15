"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangleIcon,
  BriefcaseIcon,
  CalendarClockIcon,
  CheckIcon,
  GripVerticalIcon,
  UserRoundIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { describeDue, formatRelative } from "@/shared/lib/format";
import { DUE_ACCENT, DUE_TEXT, TASK_PRIORITY } from "../lib/labels";
import { AssigneePicker } from "./assignee-picker";
import { AutoTaskBadge } from "./auto-task-badge";
import type { Colleague, Task } from "../lib/types";

/**
 * Carte du tableau.
 *
 * La poignée de gauche est la seule zone qui déclenche le glisser : sans elle,
 * cliquer sur le titre ou sur l'assigné amorcerait un déplacement au lieu
 * d'ouvrir la tâche ou le menu.
 *
 * La bordure gauche colore l'urgence — rouge en retard, ambre aujourd'hui —
 * pour que l'état se lise sans parcourir les dates.
 */
export function TaskCard({
  task,
  colleagues,
  canWrite,
  onOpen,
  onAssign,
  overlay = false,
}: {
  task: Task;
  colleagues: Colleague[];
  canWrite: boolean;
  onOpen: (task: Task) => void;
  onAssign: (task: Task, assigneeId: string | null) => void;
  overlay?: boolean;
}) {
  const sortable = useSortable({ id: task.id, disabled: !canWrite || overlay });
  const done = task.status === "terminee";
  const due = describeDue(task.due_at, done);

  const customers = task.targets.filter((t) => t.customer_id);
  const projects = task.targets.filter((t) => t.project_id);

  return (
    <li
      ref={overlay ? undefined : sortable.setNodeRef}
      style={
        overlay
          ? undefined
          : {
              transform: CSS.Translate.toString(sortable.transform),
              transition: sortable.transition,
            }
      }
      className={cn(
        "bg-card group relative flex gap-2 rounded-lg border border-l-3 p-3",
        "shadow-sm transition-shadow hover:shadow-md",
        DUE_ACCENT[due.tone],
        // La carte d'origine s'efface pendant le glisser : c'est le calque
        // flottant qui suit le curseur.
        sortable.isDragging && "opacity-30",
        overlay && "rotate-2 cursor-grabbing shadow-xl",
      )}
    >
      {canWrite && (
        <button
          type="button"
          aria-label={`Déplacer « ${task.title} »`}
          className={cn(
            "text-muted-foreground/30 hover:text-muted-foreground -ml-1 shrink-0 cursor-grab",
            "touch-none self-start pt-0.5 transition-colors active:cursor-grabbing",
          )}
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="hover:text-primary block w-full text-left text-sm leading-snug font-medium"
        >
          <span className={cn(done && "text-muted-foreground line-through")}>
            {task.title}
          </span>
          {task.auto_rule && <AutoTaskBadge rule={task.auto_rule} className="ml-1.5" />}
        </button>

        {task.body && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
            {task.body}
          </p>
        )}

        {(customers.length > 0 || projects.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {customers.map((target) => (
              <Badge
                key={target.id}
                asChild
                className="bg-accent text-accent-foreground max-w-full gap-1"
              >
                <Link
                  href={`/customers/${target.customer_id}`}
                  className="truncate"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <UserRoundIcon />
                  <span className="truncate">{target.label}</span>
                </Link>
              </Badge>
            ))}
            {/* Une affaire mène à la fiche dont elle relève : c'est là qu'on
                trouve le téléphone du client quand la tâche est « rappeler ».
                Sans `owner_id`, l'étiquette n'ouvrait rien. */}
            {projects.map((target) =>
              target.owner_id ? (
                <Badge
                  key={target.id}
                  asChild
                  variant="outline"
                  className="max-w-full gap-1"
                >
                  <Link
                    href={`/customers/${target.owner_id}`}
                    className="truncate"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <BriefcaseIcon />
                    <span className="truncate">{target.label}</span>
                  </Link>
                </Badge>
              ) : (
                <Badge key={target.id} variant="outline" className="max-w-full gap-1">
                  <BriefcaseIcon />
                  <span className="truncate">{target.label}</span>
                </Badge>
              ),
            )}
          </div>
        )}

        {/*
          L'urgence ne se montre que lorsqu'elle l'est.

          Une pastille « Normale » sur chaque carte remplirait le tableau d'une
          information qui ne fait rien changer, et il n'y aurait plus de place
          pour celles qui en font. « Basse » se montre aussi : elle dit qu'on
          peut passer devant.
        */}
        {task.priority !== "normale" && !done && (
          <div className="mt-2.5">
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium",
                task.priority === "haute"
                  ? "bg-danger-soft text-danger"
                  : "bg-neutral-soft text-neutral",
              )}
            >
              {TASK_PRIORITY[task.priority].label}
            </span>
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span
            title={due.title}
            className={cn("flex min-w-0 items-center gap-1 text-xs", DUE_TEXT[due.tone])}
          >
            {due.tone === "overdue" ? (
              <AlertTriangleIcon className="size-3.5 shrink-0" />
            ) : done ? (
              <CheckIcon className="size-3.5 shrink-0" />
            ) : (
              <CalendarClockIcon className="size-3.5 shrink-0" />
            )}
            <span className="truncate">{due.label}</span>
          </span>

          <div className="flex shrink-0 items-center gap-2">
            {/* Une tâche qui traîne sans échéance mérite qu'on le voie. */}
            {!task.due_at && !done && (
              <span
                className="text-muted-foreground/50 text-[0.65rem]"
                title={`Créée le ${new Date(task.created_at).toLocaleDateString("fr-FR")}`}
              >
                créée {formatRelative(task.created_at)}
              </span>
            )}
            <AssigneePicker
              assigneeId={task.assignee_id}
              assigneeName={task.assignee_name}
              colleagues={colleagues}
              disabled={!canWrite || overlay}
              onChange={(assigneeId) => onAssign(task, assigneeId)}
            />
          </div>
        </div>
      </div>
    </li>
  );
}
