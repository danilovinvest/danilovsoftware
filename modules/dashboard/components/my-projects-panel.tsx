"use client";

import Link from "next/link";
import { FolderKanbanIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, plural } from "@/shared/lib/format";
import { customerHref } from "@/shared/lib/routes";
import { Panel, RowShell, TONE_TEXT } from "@/shared/ui/panel";
import type { Live, MyProjectRow } from "../hooks/use-live";
import { PanelEmpty, PanelLink, PanelMore, PanelState } from "./parts";

const MAX_ROWS = 6;

/**
 * Mes dossiers, les plus urgents d'abord.
 *
 * L'ordre est celui du serveur — en retard, puis sans prochaine action, puis
 * par échéance — et le panneau n'en montre que la tête : la liste entière vit
 * dans « Mes dossiers », ce bloc dit seulement par lesquels commencer.
 */
export function MyProjectsPanel({ live }: { live: Live<MyProjectRow[]> }) {
  const rows = live.data;
  const late = rows?.filter((row) => row.urgency === "retard").length ?? 0;
  const idle = rows?.filter((row) => row.urgency === "sans_action").length ?? 0;

  return (
    <Panel
      title="Mes dossiers"
      description={
        rows
          ? `${late} en retard · ${idle} sans prochaine action`
          : "Les affaires qui vous sont confiées"
      }
      icon={FolderKanbanIcon}
      tone={late > 0 ? "danger" : idle > 0 ? "warning" : "neutral"}
      action={<PanelLink href="/mes-dossiers">Mes dossiers</PanelLink>}
      bodyClassName="divide-y"
    >
      <PanelState live={live}>
        {(data) =>
          data.length === 0 ? (
            <PanelEmpty>Aucun dossier ne vous est confié.</PanelEmpty>
          ) : (
            <>
              {data.slice(0, MAX_ROWS).map((row) => (
                <ProjectRow key={row.project.id} row={row} />
              ))}
              {data.length > MAX_ROWS && (
                <PanelMore href="/mes-dossiers">
                  et {plural(data.length - MAX_ROWS, "autre")} — voir mes dossiers
                </PanelMore>
              )}
            </>
          )
        }
      </PanelState>
    </Panel>
  );
}

/** Chez qui, quoi, et ce qui a placé la ligne là : la prochaine action ou le délai. */
function ProjectRow({ row }: { row: MyProjectRow }) {
  const { project, deadline, urgency } = row;
  const task = project.next_task;
  return (
    <RowShell className="p-0">
      <Link
        href={`${customerHref(project.customer_id)}&affaire=${project.id}`}
        className="block min-w-0 flex-1 px-4 py-2.5"
      >
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium">{project.customer_name}</span>
          {urgency === "retard" && (
            <span className="bg-danger-soft text-danger shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium">
              En retard
            </span>
          )}
        </span>
        <span className="text-muted-foreground block truncate text-[11px]">{project.label}</span>
        {task ? (
          <span className={cn("block truncate text-[11px]", task.is_overdue ? "text-danger" : "text-foreground")}>
            → {task.title}
            {task.due_at && ` · ${task.is_overdue ? "en retard depuis le" : "pour le"} ${formatDate(task.due_at)}`}
          </span>
        ) : (
          <span className="text-warning block truncate text-[11px]">Aucune prochaine action assignée</span>
        )}
        {deadline && deadline.tone !== "neutral" && (
          <span className={cn("block truncate text-[11px]", TONE_TEXT[deadline.tone])}>{deadline.label}</span>
        )}
      </Link>
    </RowShell>
  );
}
