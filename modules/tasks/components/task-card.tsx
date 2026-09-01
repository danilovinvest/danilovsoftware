"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClockIcon, GripVerticalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDate } from "@/shared/lib/format";
import { AssigneePicker } from "./assignee-picker";
import type { Colleague, Task } from "../lib/types";

/**
 * Carte du tableau. La poignée de gauche est la seule zone qui déclenche le
 * glisser : sans elle, cliquer sur le titre ou sur l'assigné amorcerait un
 * déplacement au lieu d'ouvrir la tâche ou le menu.
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
  /** Rendu au-dessus du tableau pendant le glisser : ni tri ni interaction. */
  overlay?: boolean;
}) {
  const sortable = useSortable({ id: task.id, disabled: !canWrite || overlay });

  return (
    <li
      ref={overlay ? undefined : sortable.setNodeRef}
      style={
        overlay
          ? undefined
          : { transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }
      }
      className={cn(
        "bg-card group flex gap-2 rounded-lg border p-3 shadow-sm",
        sortable.isDragging && "opacity-40",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      {canWrite && (
        <button
          type="button"
          aria-label={`Déplacer « ${task.title} »`}
          className="text-muted-foreground/40 hover:text-muted-foreground -ml-1 cursor-grab touch-none active:cursor-grabbing"
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
          className="hover:text-primary block w-full text-left text-sm font-medium"
        >
          {task.title}
        </button>

        {task.body && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{task.body}</p>
        )}

        {task.targets.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.targets.map((target) =>
              target.customer_id ? (
                <Badge key={target.id} variant="outline" asChild className="max-w-full">
                  <Link
                    href={`/customers/${target.customer_id}`}
                    className="truncate"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    {target.label}
                  </Link>
                </Badge>
              ) : (
                <Badge key={target.id} variant="outline" className="max-w-full truncate">
                  {target.label}
                </Badge>
              ),
            )}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          {task.due_at ? (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                task.is_overdue ? "text-danger font-medium" : "text-muted-foreground",
              )}
            >
              <CalendarClockIcon className="size-3.5" />
              {formatDate(task.due_at)}
            </span>
          ) : (
            <span className="text-muted-foreground/60 text-xs">Sans échéance</span>
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
    </li>
  );
}
