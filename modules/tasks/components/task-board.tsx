"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATUS_ORDER, TASK_STATUS } from "../lib/labels";
import { positionBetween } from "../lib/position";
import { TaskCard } from "./task-card";
import type { Colleague, Task, TaskStatus } from "../lib/types";

/**
 * Tableau kanban : une colonne par statut, glisser-déposer entre colonnes et à
 * l'intérieur d'une colonne.
 *
 * Le déplacement est appliqué localement avant l'appel réseau — sinon la carte
 * repartirait à sa place le temps de l'aller-retour, ce qui donne l'impression
 * que le geste a échoué.
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

  const sensors = useSensors(
    // Un petit seuil évite qu'un clic sur la poignée compte comme un glisser.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      a_faire: [],
      en_cours: [],
      terminee: [],
    };
    for (const task of tasks) grouped[task.status]?.push(task);
    for (const status of STATUS_ORDER) {
      grouped[status].sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [tasks]);

  function handleDragStart(event: DragStartEvent) {
    setDragging(tasks.find((task) => task.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const active = tasks.find((task) => task.id === event.active.id);
    setDragging(null);
    if (!active || !event.over) return;

    // La zone survolée est soit une colonne vide, soit une autre carte.
    const overTask = tasks.find((task) => task.id === event.over!.id);
    const target = (overTask?.status ?? (event.over.id as TaskStatus)) as TaskStatus;
    if (!STATUS_ORDER.includes(target)) return;

    const column = columns[target].filter((task) => task.id !== active.id);
    const index = overTask ? column.findIndex((task) => task.id === overTask.id) : column.length;
    const at = index < 0 ? column.length : index;

    const position = positionBetween(column[at - 1]?.position, column[at]?.position);
    if (target === active.status && position === active.position) return;

    onMove(active, target, position);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {STATUS_ORDER.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={columns[status]}
            colleagues={colleagues}
            canWrite={canWrite}
            onOpen={onOpen}
            onCreate={onCreate}
            onAssign={onAssign}
          />
        ))}
      </div>

      <DragOverlay>
        {dragging && (
          <ul>
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
  onOpen,
  onCreate,
  onAssign,
}: {
  status: TaskStatus;
  tasks: Task[];
  colleagues: Colleague[];
  canWrite: boolean;
  onOpen: (task: Task) => void;
  onCreate: (status: TaskStatus) => void;
  onAssign: (task: Task, assigneeId: string | null) => void;
}) {
  // La colonne elle-même est une zone de dépôt : sans cela, on ne pourrait
  // rien déposer dans une colonne vide.
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "bg-muted/40 flex flex-col gap-3 rounded-xl border p-3 transition-colors",
        isOver && "border-primary/40 bg-accent/40",
      )}
    >
      <header className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          {TASK_STATUS[status].label}
          <span className="text-muted-foreground tabular-nums">{tasks.length}</span>
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
        <ul className="flex min-h-24 flex-col gap-2">
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
            <li className="text-muted-foreground/60 grid h-24 place-items-center text-xs">
              Déposez une carte ici
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}
