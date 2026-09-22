"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangleIcon, BellIcon, CheckCheckIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { listTasks, type Task, type TaskStatus } from "@/modules/tasks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/shared/lib/format";
import { cn } from "@/lib/utils";

/** Ce qui réclame encore quelque chose : tout sauf « terminée ». */
const OUVERTES: TaskStatus[] = ["a_faire", "en_cours", "en_attente"];

/** Cinq minutes : le rythme de toutes les copies du CRM. */
const RELECTURE_MS = 5 * 60_000;

type Reclame = { retard: Task[]; aujourdhui: Task[] };

/**
 * La cloche : les tâches qui réclament l'appelant.
 *
 * Ce n'est pas un système de notifications, et c'est voulu. Il n'y a ni table
 * ni marqueur « vu » : ce serait une copie de faits qui existent déjà, et un
 * « nouveau pour qui » sans réponse à deux utilisateurs. Ce qui réclame, ce
 * sont les tâches ouvertes qu'on m'a confiées et qui sont en retard ou dues
 * aujourd'hui — l'API les sait déjà, la cloche les lit.
 *
 * `due=today` ne retire pas les tâches terminées côté serveur, d'où le statut
 * passé explicitement. Une tâche d'aujourd'hui dont l'heure est passée est
 * aussi en retard : elle n'est comptée qu'une fois, dans le retard.
 */
export function NotificationsMenu({ buttonClassName }: { buttonClassName: string }) {
  const canRead = usePermission("tasks:read");
  const [reclame, setReclame] = useState<Reclame | null>(null);
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    if (!canRead) return;
    const controller = new AbortController();

    function charger() {
      Promise.all([
        listTasks({ assignee_id: "mine", due: "overdue", status: OUVERTES, per_page: 20 }, controller.signal),
        listTasks({ assignee_id: "mine", due: "today", status: OUVERTES, per_page: 20 }, controller.signal),
      ])
        .then(([retard, jour]) => {
          setReclame({
            retard: retard.items,
            aujourdhui: jour.items.filter((task) => !task.is_overdue),
          });
          setEchec(false);
        })
        /*
          L'échec se dit dans le menu, pas dans l'en-tête de tous les écrans.
          Avalé, il affichait « Rien en retard » quand l'API était tombée :
          une fausse bonne nouvelle.
        */
        .catch(() => {
          if (!controller.signal.aborted) setEchec(true);
        });
    }

    charger();
    const timer = setInterval(charger, RELECTURE_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [canRead]);

  if (!canRead) return null;

  const total = (reclame?.retard.length ?? 0) + (reclame?.aujourdhui.length ?? 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={total > 0 ? `Notifications, ${total} en attente` : "Notifications"}
          title="Notifications"
          className={buttonClassName}
        >
          <BellIcon />
          {total > 0 && (
            <span
              className={cn(
                "ring-background absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold tabular-nums ring-2",
                // Rouge seulement s'il y a du retard : « dû aujourd'hui » n'est
                // pas encore une faute.
                reclame?.retard.length ? "bg-danger text-background" : "bg-foreground text-background",
              )}
            >
              {total > 9 ? "9+" : total}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-80 overflow-hidden rounded-xl p-0">
        <div className="flex items-center justify-between border-b px-3.5 py-2.5">
          <span className="text-sm font-medium">Notifications</span>
          <Link href="/tasks" className="text-muted-foreground hover:text-foreground text-xs">
            Mes tâches
          </Link>
        </div>

        {echec && (
          <p className="text-danger bg-danger-soft/40 flex items-center gap-1.5 px-3.5 py-2 text-xs">
            <AlertTriangleIcon className="size-3.5 shrink-0" />
            {reclame === null
              ? "Impossible de vérifier vos tâches pour l'instant."
              : "Liste non actualisée : le serveur ne répond pas."}
          </p>
        )}
        {echec && reclame === null ? null : total === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 px-4 py-8 text-center text-sm">
            <CheckCheckIcon className="text-success size-5" />
            {reclame === null
              ? "Chargement…"
              : "Rien en retard, rien pour aujourd'hui."}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto p-1.5">
            <Section titre="En retard" taches={reclame?.retard ?? []} ton="text-danger" />
            <Section titre="Aujourd'hui" taches={reclame?.aujourdhui ?? []} ton="text-muted-foreground" />
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Section({ titre, taches, ton }: { titre: string; taches: Task[]; ton: string }) {
  if (taches.length === 0) return null;
  return (
    <div className="mb-1 last:mb-0">
      <p className={cn("px-2 pt-1.5 pb-1 text-[11px] font-medium", ton)}>
        {titre} · {taches.length}
      </p>
      {taches.map((task) => (
        <DropdownMenuItem key={task.id} asChild className="rounded-lg px-2 py-1.5">
          <Link href={`/tasks?tache=${task.id}`} className="flex flex-col items-start gap-0.5">
            <span className="line-clamp-1 text-sm">{task.title}</span>
            <span className={cn("text-[11px]", ton)}>{formatDateTime(task.due_at)}</span>
          </Link>
        </DropdownMenuItem>
      ))}
    </div>
  );
}
