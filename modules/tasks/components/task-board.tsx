"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COLUMN_STYLE, STATUS_ORDER, TASK_STATUS } from "../lib/labels";
import { positionBetween } from "../lib/position";
import { TaskCard } from "./task-card";
import type { Colleague, Task, TaskStatus } from "../lib/types";

type Columns = Record<TaskStatus, Task[]>;

function group(tasks: Task[]): Columns {
  const columns: Columns = { a_faire: [], en_cours: [], terminee: [] };
  for (const task of tasks) columns[task.status]?.push(task);
  for (const status of STATUS_ORDER) {
    columns[status].sort((a, b) => a.position - b.position);
  }
  return columns;
}

/**
 * Tableau kanban.
 *
 * L'aperçu se fait pendant le geste, pas au déposé : `onDragOver` réarrange
 * les colonnes localement à chaque survol, si bien que les voisines s'écartent
 * en direct et qu'on voit exactement où la carte va tomber. `onDragEnd` ne fait
 * plus que calculer le rang définitif et l'envoyer au serveur.
 */
export function TaskBoard({
  tasks,
  colleagues,
  canWrite,
  onOpen,
  onCreate,
  onMove,
  onAssign,
}: {
  tasks: Task[];
  colleagues: Colleague[];
  canWrite: boolean;
  onOpen: (task: Task) => void;
  onCreate: (status: TaskStatus) => void;
  onMove: (task: Task, status: TaskStatus, position: number) => void;
  onAssign: (task: Task, assigneeId: string | null) => void;
}) {
  const [dragging, setDragging] = useState<Task | null>(null);
  // Réarrangement local le temps du geste ; annulé dès qu'il se termine.
  const [preview, setPreview] = useState<Columns | null>(null);

  const sensors = useSensors(
    // Un seuil de 4 px évite qu'un simple clic sur la poignée compte comme un
    // glisser.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const serverColumns = useMemo(() => group(tasks), [tasks]);
  const columns = preview ?? serverColumns;

  function columnOf(state: Columns, id: string): TaskStatus | null {
    if (STATUS_ORDER.includes(id as TaskStatus)) return id as TaskStatus;
    return STATUS_ORDER.find((status) => state[status].some((t) => t.id === id)) ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id) ?? null;
    setDragging(task);
    setPreview(serverColumns);
  }

  function handleDragOver(event: DragOverEvent) {
    if (!event.over || !preview) return;

    const from = columnOf(preview, String(event.active.id));
    const to = columnOf(preview, String(event.over.id));
    if (!from || !to) return;

    const fromIndex = preview[from].findIndex((t) => t.id === event.active.id);
    if (fromIndex < 0) return;

    if (from === to) {
      const overIndex = preview[to].findIndex((t) => t.id === event.over!.id);
      if (overIndex < 0 || overIndex === fromIndex) return;
      setPreview({ ...preview, [to]: arrayMove(preview[to], fromIndex, overIndex) });
      return;
    }

    // Changement de colonne : on retire d'un côté, on insère de l'autre à
    // l'endroit survolé.
    const moved = { ...preview[from][fromIndex], status: to };
    const overIndex = preview[to].findIndex((t) => t.id === event.over!.id);
    const insertAt = overIndex < 0 ? preview[to].length : overIndex;

    setPreview({
      ...preview,
      [from]: preview[from].filter((t) => t.id !== event.active.id),
      [to]: [
        ...preview[to].slice(0, insertAt),
        moved,
        ...preview[to].slice(insertAt),
      ],
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const active = tasks.find((t) => t.id === event.active.id);
    const state = preview;
    setDragging(null);
    setPreview(null);
    if (!active || !state) return;

    const target = columnOf(state, String(event.active.id));
    if (!target) return;

    const column = state[target];
    const index = column.findIndex((t) => t.id === active.id);
    if (index < 0) return;

    const position = positionBetween(column[index - 1]?.position, column[index + 1]?.position);
    if (target === active.status && position === active.position) return;

    onMove(active, target, position);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDragging(null);
        setPreview(null);
      }}
    >
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {STATUS_ORDER.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={columns[status]}
            colleagues={colleagues}
            canWrite={canWrite}
            dragging={dragging !== null}
            onOpen={onOpen}
            onCreate={onCreate}
            onAssign={onAssign}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2,0,0,1)" }}>
        {dragging && (
          <ul className="w-full">
            <TaskCard
              task={dragging}
              colleagues={colleagues}
              canWrite={canWrite}
              onOpen={() => {}}
              onAssign={() => {}}
              overlay
            />
          </ul>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
  colleagues,
  canWrite,
  dragging,
  onOpen,
  onCreate,
  onAssign,
}: {
  status: TaskStatus;
  tasks: Task[];
  colleagues: Colleague[];
  canWrite: boolean;
  dragging: boolean;
  onOpen: (task: Task) => void;
  onCreate: (status: TaskStatus) => void;
  onAssign: (task: Task, assigneeId: string | null) => void;
}) {
  // La colonne est elle-même une zone de dépôt, sans quoi on ne pourrait rien
  // déposer dans une colonne vide.
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const style = COLUMN_STYLE[status];
  const overdue = tasks.filter((task) => task.is_overdue).length;

  return (
    <section
      ref={setNodeRef}
      data-over={isOver}
      className={cn(
        "bg-muted/30 flex flex-col overflow-hidden rounded-xl border transition-colors",
        style.ring,
      )}
    >
      <span aria-hidden className={cn("h-1 w-full", style.accent)} />

      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden className={cn("size-2 rounded-full", style.dot)} />
          {TASK_STATUS[status].label}
          <span className="text-muted-foreground tabular-nums">{tasks.length}</span>
          {overdue > 0 && (
            <span className="bg-danger-soft text-danger rounded-full px-1.5 text-[0.65rem] font-medium">
              {overdue} en retard
            </span>
          )}
        </h2>
        {canWrite && (
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Ajouter une tâche dans « ${TASK_STATUS[status].label} »`}
            onClick={() => onCreate(status)}
          >
            <PlusIcon />
          </Button>
        )}
      </header>

      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex min-h-28 flex-col gap-2 p-2 pt-0">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              colleagues={colleagues}
              canWrite={canWrite}
              onOpen={onOpen}
              onAssign={onAssign}
            />
          ))}
          {tasks.length === 0 && (
            <li
              className={cn(
                "text-muted-foreground/50 grid h-24 place-items-center rounded-lg border border-dashed text-xs transition-colors",
                dragging && "border-primary/40 text-muted-foreground",
              )}
            >
              {dragging ? "Déposez ici" : "Aucune tâche"}
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}
