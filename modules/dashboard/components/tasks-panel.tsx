"use client";

import Link from "next/link";
import { ListChecksIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/modules/tasks";
import { formatDateTime, formatRelative, plural } from "@/shared/lib/format";
import { Panel, RowShell } from "@/shared/ui/panel";
import type { Live, MyTasks } from "../hooks/use-live";
import { PanelEmpty, PanelLink, PanelMore, PanelState } from "./parts";

/** Ce que le panneau montre au plus : au-delà, c'est l'écran des tâches. */
const MAX_ROWS = 6;

const hour = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

/**
 * Mes tâches : ce qui est en retard, puis ce qui est dû aujourd'hui.
 *
 * Le retard passe devant et garde sa place même quand la journée est chargée :
 * une tâche d'hier qu'on n'a pas faite ne devient pas moins urgente parce
 * qu'il y en a six aujourd'hui.
 */
export function TasksPanel({ live }: { live: Live<MyTasks> }) {
  const tasks = live.data;
  const late = tasks?.overdueTotal ?? 0;

  return (
    <Panel
      title="Mes tâches"
      description={
        tasks
          ? `${plural(late, "tâche")} en retard · ${tasks.today.length} pour aujourd'hui`
          : "En retard, et pour aujourd'hui"
      }
      icon={ListChecksIcon}
      tone={late > 0 ? "danger" : "neutral"}
      action={<PanelLink href="/tasks?assignee=mine">Mes tâches</PanelLink>}
      bodyClassName="divide-y"
    >
      <PanelState live={live}>
        {(data) => {
          const rows = [
            ...data.overdue.map((task) => ({ task, late: true })),
            ...data.today.map((task) => ({ task, late: false })),
          ];
          const total = data.overdueTotal + data.today.length;
          if (rows.length === 0) {
            return <PanelEmpty>Rien en retard, rien pour aujourd&apos;hui.</PanelEmpty>;
          }
          return (
            <>
              {rows.slice(0, MAX_ROWS).map((row) => (
                <TaskRow key={row.task.id} task={row.task} late={row.late} />
              ))}
              {total > MAX_ROWS && (
                <PanelMore href="/tasks?assignee=mine">
                  et {plural(total - MAX_ROWS, "autre")} — voir mes tâches
                </PanelMore>
              )}
            </>
          );
        }}
      </PanelState>
    </Panel>
  );
}

function TaskRow({ task, late }: { task: Task; late: boolean }) {
  const target = task.targets[0];
  const about = target ? target.owner_name || target.label : "";
  return (
    <RowShell className="p-0">
      <Link href={`/tasks?tache=${task.id}`} className="flex min-w-0 flex-1 items-start gap-3 px-4 py-2.5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{task.title}</span>
          {about && <span className="text-muted-foreground block truncate text-[11px]">{about}</span>}
        </span>
        {task.due_at && (
          <span
            title={formatDateTime(task.due_at)}
            className={cn(
              "shrink-0 text-[11px] font-medium tabular-nums",
              late ? "text-danger" : "text-muted-foreground",
            )}
          >
            {late ? formatRelative(task.due_at) : hour.format(new Date(task.due_at))}
          </span>
        )}
      </Link>
    </RowShell>
  );
}
