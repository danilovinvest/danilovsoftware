"use client";

import Link from "next/link";
import { CalendarClockIcon, CheckIcon, Trash2Icon, UserIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { describeDue } from "@/shared/lib/format";
import * as api from "../lib/api";
import { DUE_TEXT } from "../lib/labels";
import { TaskStatusBadge } from "./task-badge";
import type { Task, TaskStatus } from "../lib/types";

/**
 * Une tâche en une ligne. Le geste principal — la cocher — est la case à
 * gauche ; ouvrir le détail passe par le titre.
 */
export function TaskRow({
  task,
  onChanged,
  onOpen,
}: {
  task: Task;
  onChanged: () => void;
  onOpen: (task: Task) => void;
}) {
  const canWrite = usePermission("tasks:write");
  const canDelete = usePermission("tasks:delete");
  const done = task.status === "terminee";
  const due = describeDue(task.due_at, done);

  async function toggle() {
    const next: TaskStatus = done ? "a_faire" : "terminee";
    await api.setTaskStatus(task.id, next);
    onChanged();
  }

  return (
    <li className="hover:bg-muted/40 flex items-start gap-3 px-4 py-3">
      <button
        type="button"
        disabled={!canWrite}
        onClick={toggle}
        aria-label={done ? "Rouvrir la tâche" : "Marquer comme terminée"}
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
          done
            ? "bg-success border-success text-white"
            : "border-input hover:border-primary",
          !canWrite && "cursor-not-allowed opacity-50",
        )}
      >
        {done && <CheckIcon className="size-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="hover:text-primary block text-left text-sm font-medium"
        >
          <span className={cn(done && "text-muted-foreground line-through")}>
            {task.title}
          </span>
        </button>

        {task.body && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{task.body}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <TaskStatusBadge status={task.status} />

          {task.due_at && (
            <span
              title={due.title}
              className={cn("flex items-center gap-1", DUE_TEXT[due.tone])}
            >
              <CalendarClockIcon className="size-3.5" />
              {due.label}
            </span>
          )}

          {task.assignee_name && (
            <span className="text-muted-foreground flex items-center gap-1">
              <UserIcon className="size-3.5" />
              {task.assignee_name}
            </span>
          )}

          {/* Fiche ou affaire, l'étiquette mène toujours à la fiche : une
              affaire porte désormais celle dont elle relève. */}
          {task.targets.map((target) => {
            const fiche = target.customer_id ?? target.owner_id;
            return fiche ? (
              <Badge key={target.id} variant="outline" asChild>
                <Link href={`/customers/${fiche}`}>{target.label}</Link>
              </Badge>
            ) : (
              <Badge key={target.id} variant="outline">
                {target.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {canDelete && (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Supprimer « ${task.title} »`}
          onClick={async () => {
            if (!confirm(`Supprimer la tâche « ${task.title} » ?`)) return;
            await api.deleteTask(task.id);
            onChanged();
          }}
        >
          <Trash2Icon />
        </Button>
      )}
    </li>
  );
}
