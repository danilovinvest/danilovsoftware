"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { countLoaded, useServerCounts, useTasks } from "../hooks/use-tasks";
import { useColleagues } from "@/shared/hooks/use-colleagues";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { TaskBoard } from "./task-board";
import { TaskDialog } from "./task-dialog";
import { TaskRow } from "./task-row";
import { CustomerPicker } from "@/modules/customers";
import type { DueFilter, Task, TaskFilters, TaskStatus } from "../lib/types";
import { notifyError } from "@/shared/ui/toaster";
import { errorMessage } from "@/shared/api/errors";

type View = "board" | "list";

/** Le plafond d'une page côté API (`httpx.maxPerPage`). */
const PAGE_SIZE = 200;

export function TasksView() {
  const canWrite = usePermission("tasks:write");
  const colleagues = useColleagues();

  const [view, setView] = useState<View>("board");
  // Le tableau s'ouvre sur toute l'équipe : en portée « mes tâches »,
  // réassigner une carte la ferait disparaître sous le curseur, ce qui se lit
  // comme une suppression. « Mes tâches » reste à un clic.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tache = searchParams.get("tache");
  const [filters, setFilters] = useState<TaskFilters>(() => ({
    sort: "position",
    page: 1,
    per_page: PAGE_SIZE,
    // `?assignee=mine` : le lien « mes tâches » se partage et se retrouve.
    assignee_id: searchParams.get("assignee") === "mine" ? "mine" : undefined,
  }));
  const [search, setSearch] = useState("");
  /*
   * Le filtre part au serveur une fois la frappe posée, pas à chaque lettre
   * (issue 78) : « relancer » faisait huit requêtes, et une réponse lente
   * pouvait se poser sous une frappe plus récente. Il est dérivé plutôt que
   * recopié dans les filtres par un effet.
   */
  const debouncedSearch = useDebounced(search.trim());
  /** Le nom de la fiche filtrée : le filtre ne transporte que son identifiant. */
  const [customerName, setCustomerName] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);

  /*
    `?tache=` ouvre la tâche désignée. La cloche et la recherche menaient à
    `/tasks` tout court : un tableau de deux cents cartes où il fallait
    chercher une seconde fois ce qu'on venait de cliquer.
  */
  useEffect(() => {
    if (!tache) return;
    const controller = new AbortController();
    api
      .getTask(tache, controller.signal)
      .then(setEditing)
      .catch(() => {
        if (!controller.signal.aborted) notifyError("La tâche demandée est introuvable ou n'est plus accessible.");
      });
    return () => controller.abort();
  }, [tache]);

  function fermer() {
    setEditing(null);
    if (tache) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tache");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }
  const [creatingIn, setCreatingIn] = useState<TaskStatus | null>(null);

  /*
    Le nombre de pages chargées, attaché aux filtres qui l'ont demandé : changer
    de filtre repart d'une page sans qu'aucun effet ait à le remettre à zéro.
  */
  const query: TaskFilters = { ...filters, search: debouncedSearch || undefined };
  const filtersKey = JSON.stringify(query);
  const [more, setMore] = useState({ filtersKey: "", pages: 1 });
  const pages = more.filtersKey === filtersKey ? more.pages : 1;

  const { data, loading, error, reload } = useTasks(query, pages);
  const [countsToken, setCountsToken] = useState(0);

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
    setCountsToken((value) => value + 1);
  }

  /*
    La liste est-elle entière ? Tant qu'elle l'est, les compteurs se lisent sur
    les cartes chargées — ce sont alors exactement les colonnes, correctif local
    compris. Au-delà d'une page, ils viennent du serveur, avec les mêmes filtres.
  */
  const total = data?.total ?? 0;
  const complete = data !== null && items.length >= total;
  const serverCounts = useServerCounts(query, data !== null && !complete, countsToken);
  const counts = complete ? countLoaded(items) : data ? serverCounts : null;

  async function toggleDone(task: Task) {
    const status: TaskStatus = task.status === "terminee" ? "a_faire" : "terminee";
    if (data) {
      setPatched({
        source: data,
        items: items.map((item) => (item.id === task.id ? { ...item, status } : item)),
      });
    }
    try {
      await api.setTaskStatus(task.id, status);
    } catch (cause) {
      setPatched(null);
      notifyError(`La tâche n'a pas été mise à jour : ${errorMessage(cause)}`, () =>
        void toggleDone(task),
      );
      return;
    }
    refresh();
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
    try {
      await api.moveTask(task.id, status, position);
    } catch (cause) {
      // La carte revient où elle était, et le dit : laissée dans la mauvaise
      // colonne, elle se lisait comme un déplacement réussi.
      setPatched(null);
      notifyError(`La tâche n'a pas été déplacée : ${errorMessage(cause)}`, () =>
        void move(task, status, position),
      );
      return;
    }
    refresh();
  }

  async function assign(task: Task, assigneeId: string | null) {
    try {
      await api.setTaskAssignee(task.id, assigneeId);
    } catch (cause) {
      notifyError(`La tâche n'a pas été attribuée : ${errorMessage(cause)}`);
      return;
    }
    refresh();
  }

  const mine = filters.assignee_id === "mine";
  const filtered = Boolean(
    query.search || filters.status?.length || filters.due || filters.customer_id,
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
            <Button size="lg" data-demo="task-new" onClick={() => setCreatingIn("a_faire")}>
              <PlusIcon />
              Nouvelle tâche
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-demo="task-counts">
        {STATUS_ORDER.map((status) => (
          <Card key={status}>
            <CardContent>
              <p className="text-muted-foreground text-xs">{TASK_STATUS[status].label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                <Count value={counts?.byStatus[status] ?? null} />
              </p>
            </CardContent>
          </Card>
        ))}
        <Card className={cn((counts?.overdue ?? 0) > 0 && "border-danger/40")}>
          <CardContent>
            <p className="text-muted-foreground text-xs">En retard</p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                (counts?.overdue ?? 0) > 0 && "text-danger",
              )}
            >
              <Count value={counts?.overdue ?? null} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/*
        La barre de filtre en pleine largeur, au-dessus de tout le reste, comme
        sur un tableau GitHub Projects.

        C'est le premier geste qu'on fait en arrivant sur l'écran, et un champ de
        deux cent quatre-vingts pixels coincé entre deux groupes de boutons ne le
        disait pas. Les filtres qui restent en dessous sont ceux qu'on choisit,
        pas ceux qu'on tape.
      */}
      <div className="relative" data-demo="task-filter">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          aria-label="Filtrer les tâches"
          placeholder="Filtrer par mot-clé ou par champ"
          className="h-10 pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
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
                per_page: PAGE_SIZE,
              }));
            }}
          >
            <XIcon />
            Réinitialiser
          </Button>
        )}
      </div>

      {/*
        Au-delà d'une page, la liste le dit. Elle s'arrêtait en silence à deux
        cents cartes, et la deux cent unième tâche n'existait pour personne.
      */}
      {data && !error && !complete && (
        <div
          data-demo="task-truncated"
          className="bg-warning-soft text-warning flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
        >
          <span>
            <strong className="tabular-nums">{items.length}</strong> sur{" "}
            <strong className="tabular-nums">{total}</strong> tâches affichées
            {view === "board" ? " : les colonnes ne montrent que celles-ci." : "."}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => setMore({ filtersKey, pages: pages + 1 })}
          >
            {loading
              ? "Chargement…"
              : `Afficher les ${Math.min(PAGE_SIZE, total - items.length)} suivantes`}
          </Button>
        </div>
      )}

      {error ? (
        <ErrorNotice message={error} onRetry={refresh} />
      ) : loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          onToggleDone={toggleDone}
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
          onOpenChange={(open) => !open && fermer()}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

/** Un compteur, ou « — » quand on ne le connaît pas : jamais un 0 inventé. */
function Count({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-muted-foreground" title="Compteur indisponible">
        —
      </span>
    );
  }
  return <>{value}</>;
}
