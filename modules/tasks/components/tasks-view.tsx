"use client";

import { useMemo, useState } from "react";
import { PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorNotice, Skeleton } from "@/shared/ui/feedback";
import { cn } from "@/lib/utils";
import { DUE_FILTERS, STATUS_ORDER, TASK_STATUS } from "../lib/labels";
import { useTasks, useTaskStats } from "../hooks/use-tasks";
import { TaskDialog } from "./task-dialog";
import { TaskRow } from "./task-row";
import type { DueFilter, Task, TaskFilters } from "../lib/types";

/** Écran principal : ce que j'ai à faire, ce qui est en retard, tout le reste. */
export function TasksView() {
  const canWrite = usePermission("tasks:write");
  const [filters, setFilters] = useState<TaskFilters>({
    assignee_id: "mine",
    sort: "due",
    page: 1,
    per_page: 50,
  });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, loading, error, reload } = useTasks(filters);
  const [statsToken, setStatsToken] = useState(0);
  const stats = useTaskStats(filters.assignee_id, statsToken);

  function update(patch: Partial<TaskFilters>) {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }

  function refresh() {
    reload();
    setStatsToken((value) => value + 1);
  }

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const entry of stats?.by_status ?? []) result[entry.status] = entry.total;
    return result;
  }, [stats]);

  const mine = filters.assignee_id === "mine";
  const filtered = Boolean(filters.search || filters.status?.length || filters.due);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Tâches</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Ce qu&apos;il reste à faire, pour qui, et sur quelle fiche.
          </p>
        </div>
        {canWrite && (
          <Button size="lg" onClick={() => setCreating(true)}>
            <PlusIcon />
            Nouvelle tâche
          </Button>
        )}
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

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-4 p-5">
          <nav className="flex flex-wrap gap-1" aria-label="Portée">
            {[
              { value: "mine", label: "Mes tâches" },
              { value: undefined, label: "Toute l'équipe" },
            ].map((scope) => (
              <button
                key={scope.label}
                type="button"
                aria-pressed={mine === (scope.value === "mine")}
                onClick={() => update({ assignee_id: scope.value })}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  mine === (scope.value === "mine")
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {scope.label}
              </button>
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
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

            {STATUS_ORDER.map((status) => {
              const active = filters.status?.[0] === status;
              return (
                <Button
                  key={status}
                  size="sm"
                  variant={active ? "secondary" : "ghost"}
                  onClick={() => update({ status: active ? undefined : [status] })}
                >
                  {TASK_STATUS[status].label}
                </Button>
              );
            })}

            {DUE_FILTERS.map((due) => {
              const active = filters.due === due.value;
              return (
                <Button
                  key={due.value}
                  size="sm"
                  variant={active ? "secondary" : "ghost"}
                  onClick={() =>
                    update({ due: active ? undefined : (due.value as DueFilter) })
                  }
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
                  setFilters((current) => ({
                    assignee_id: current.assignee_id,
                    sort: "due",
                    page: 1,
                    per_page: 50,
                  }));
                }}
              >
                <XIcon />
                Réinitialiser
              </Button>
            )}
          </div>
        </div>

        {error ? (
          <div className="px-5 pb-5">
            <ErrorNotice message={error} />
          </div>
        ) : loading && !data ? (
          <div className="flex flex-col gap-2 p-5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
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
        ) : (
          <ul className="divide-y border-t">
            {data?.items.map((task) => (
              <TaskRow key={task.id} task={task} onChanged={refresh} onOpen={setEditing} />
            ))}
          </ul>
        )}
      </Card>

      {creating && (
        <TaskDialog
          task={null}
          open
          onOpenChange={(open) => !open && setCreating(false)}
          onSaved={refresh}
        />
      )}
      {editing && (
        <TaskDialog
          key={editing.id}
          task={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
