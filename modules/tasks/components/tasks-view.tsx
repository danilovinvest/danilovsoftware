"use client";

import { useMemo, useState } from "react";
import { KanbanSquareIcon, ListIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import type { Paginated } from "@/shared/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorNotice, Skeleton } from "@/shared/ui/feedback";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import { DUE_FILTERS, STATUS_ORDER, TASK_STATUS } from "../lib/labels";
import { useTasks, useTaskStats } from "../hooks/use-tasks";
import { useColleagues } from "../hooks/use-colleagues";
import { TaskBoard } from "./task-board";
import { TaskDialog } from "./task-dialog";
import { TaskRow } from "./task-row";
import { CustomerPicker } from "@/modules/customers";
import type { DueFilter, Task, TaskFilters, TaskStatus } from "../lib/types";

type View = "board" | "list";

export function TasksView() {
  const canWrite = usePermission("tasks:write");
  const colleagues = useColleagues();

  const [view, setView] = useState<View>("board");
  // Le tableau s'ouvre sur toute l'équipe : en portée « mes tâches »,
  // réassigner une carte la ferait disparaître sous le curseur, ce qui se lit
  // comme une suppression. « Mes tâches » reste à un clic.
  const [filters, setFilters] = useState<TaskFilters>({
    sort: "position",
    page: 1,
    per_page: 200,
  });
  const [search, setSearch] = useState("");
  /** Le nom de la fiche filtrée : le filtre ne transporte que son identifiant. */
  const [customerName, setCustomerName] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [creatingIn, setCreatingIn] = useState<TaskStatus | null>(null);

  const { data, loading, error, reload } = useTasks(filters);
  const [statsToken, setStatsToken] = useState(0);
  const stats = useTaskStats(filters.assignee_id, statsToken);

  /**
   * Correctif local appliqué le temps de l'aller-retour réseau. Sans lui, une
   * carte déposée reviendrait à sa place jusqu'à la réponse du serveur, ce qui
   * donne l'impression que le geste a échoué. Il s'invalide de lui-même dès que
   * le serveur renvoie une nouvelle liste.
   */
  const [patched, setPatched] = useState<{ source: Paginated<Task>; items: Task[] } | null>(null);
  const items = patched && patched.source === data ? patched.items : (data?.items ?? []);

  function update(patch: Partial<TaskFilters>) {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }

  function refresh() {
    reload();
    setStatsToken((value) => value + 1);
  }

  async function move(task: Task, status: TaskStatus, position: number) {
    if (data) {
      setPatched({
        source: data,
        items: items.map((item) =>
          item.id === task.id ? { ...item, status, position } : item,
        ),
      });
    }
    await api.moveTask(task.id, status, position);
    refresh();
  }

  async function assign(task: Task, assigneeId: string | null) {
    await api.setTaskAssignee(task.id, assigneeId);
    refresh();
  }

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const entry of stats?.by_status ?? []) result[entry.status] = entry.total;
    return result;
  }, [stats]);

  const mine = filters.assignee_id === "mine";
  const filtered = Boolean(
    filters.search || filters.status?.length || filters.due || filters.customer_id,
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Tâches</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Ce qu&apos;il reste à faire, pour qui, et sur quelle fiche.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted flex rounded-lg p-0.5">
            {(
              [
                { value: "board", label: "Tableau", icon: KanbanSquareIcon },
                { value: "list", label: "Liste", icon: ListIcon },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={view === option.value}
                onClick={() => {
                  setView(option.value);
                  update({ sort: option.value === "board" ? "position" : "due" });
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  view === option.value
                    ? "bg-card shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <option.icon className="size-3.5" />
                {option.label}
              </button>
            ))}
          </div>
          {canWrite && (
            <Button size="lg" onClick={() => setCreatingIn("a_faire")}>
              <PlusIcon />
              Nouvelle tâche
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS_ORDER.map((status) => (
          <Card key={status}>
            <CardContent>
              <p className="text-muted-foreground text-xs">{TASK_STATUS[status].label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {counts[status] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
        <Card className={cn((stats?.overdue ?? 0) > 0 && "border-danger/40")}>
          <CardContent>
            <p className="text-muted-foreground text-xs">En retard</p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                (stats?.overdue ?? 0) > 0 && "text-danger",
              )}
            >
              {stats?.overdue ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <nav className="bg-muted flex rounded-lg p-0.5" aria-label="Portée">
          {[
            { value: "mine" as const, label: "Mes tâches" },
            { value: undefined, label: "Toute l'équipe" },
          ].map((scope) => {
            const active = mine === (scope.value === "mine");
            return (
              <button
                key={scope.label}
                type="button"
                aria-pressed={active}
                onClick={() => update({ assignee_id: scope.value })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  active ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {scope.label}
              </button>
            );
          })}
        </nav>

        <div className="relative min-w-48 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            aria-label="Rechercher une tâche"
            placeholder="Rechercher…"
            className="pl-8"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              update({ search: event.target.value || undefined });
            }}
          />
        </div>

        {/* Le filtre par fiche : « qu'est-ce que je dois à ce client ? » se
            posait jusqu'ici depuis la fiche seulement, écran par écran. */}
        <CustomerPicker
          className="w-56"
          placeholder="Filtrer par client…"
          value={filters.customer_id ?? null}
          valueName={customerName}
          onChange={(id, name) => {
            setCustomerName(name);
            update({ customer_id: id ?? undefined });
          }}
        />

        {DUE_FILTERS.map((due) => {
          const active = filters.due === due.value;
          return (
            <Button
              key={due.value}
              size="sm"
              variant={active ? "secondary" : "ghost"}
              onClick={() => update({ due: active ? undefined : (due.value as DueFilter) })}
            >
              {due.label}
            </Button>
          );
        })}

        {filtered && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearch("");
              setCustomerName("");
              setFilters((current) => ({
                assignee_id: current.assignee_id,
                sort: current.sort,
                page: 1,
                per_page: 200,
              }));
            }}
          >
            <XIcon />
            Réinitialiser
          </Button>
        )}
      </div>

      {error ? (
        <ErrorNotice message={error} />
      ) : loading && !data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {STATUS_ORDER.map((status) => (
            <Skeleton key={status} className="h-64 w-full" />
          ))}
        </div>
      ) : view === "board" ? (
        <TaskBoard
          tasks={items}
          colleagues={colleagues}
          canWrite={canWrite}
          onOpen={setEditing}
          onCreate={setCreatingIn}
          onMove={move}
          onAssign={assign}
        />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title={filtered ? "Aucune tâche ne correspond" : "Rien à faire pour l'instant"}
            description={
              filtered
                ? "Élargissez la recherche ou réinitialisez les filtres."
                : mine
                  ? "Aucune tâche ne vous est assignée."
                  : "Créez la première tâche."
            }
          />
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <ul className="divide-y">
            {items.map((task) => (
              <TaskRow key={task.id} task={task} onChanged={refresh} onOpen={setEditing} />
            ))}
          </ul>
        </Card>
      )}

      {creatingIn && (
        <TaskDialog
          task={null}
          open
          initialStatus={creatingIn}
          colleagues={colleagues}
          onOpenChange={(open) => !open && setCreatingIn(null)}
          onSaved={refresh}
        />
      )}
      {editing && (
        <TaskDialog
          key={editing.id}
          task={editing}
          open
          colleagues={colleagues}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
