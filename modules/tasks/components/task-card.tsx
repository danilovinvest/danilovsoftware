"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangleIcon,
  BriefcaseIcon,
  CalendarClockIcon,
  CheckIcon,
  GripVerticalIcon,
  UserRoundIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { describeDue, formatRelative } from "@/shared/lib/format";
import { DUE_ACCENT, DUE_TEXT, TASK_PRIORITY, TASK_SIZE } from "../lib/labels";
import { AssigneePicker } from "./assignee-picker";
import { AutoTaskBadge } from "./auto-task-badge";
import type { Colleague, Task } from "../lib/types";
import { customerHref } from "@/shared/lib/routes";

/**
 * Carte du tableau, sur le patron d'un tableau GitHub Projects.
 *
 * Trois étages, et l'ordre est la règle : **d'où ça vient**, **ce qu'il y a à
 * faire**, puis **ce qu'il faut savoir avant de s'y mettre**. C'est ce que
 * demande le dirigeant, qui lit ce gabarit tous les jours ailleurs :
 *
 *  - en tête, le client et le dossier — l'équivalent du dépôt et du numéro
 *    d'issue — avec l'avatar de l'assigné à droite ;
 *  - au milieu, l'intitulé seul, en gras ;
 *  - en bas, une rangée de pastilles : urgence, taille, échéance, origine.
 *
 * Les pastilles ne s'affichent que lorsqu'elles disent quelque chose. Une
 * pastille « Normale » sur chaque carte remplirait le tableau d'une information
 * qui ne fait rien changer, et il n'y aurait plus de place pour celles qui en
 * font. Même règle pour la taille, nulle tant que personne ne l'a estimée.
 *
 * La case devant l'intitulé termine ou rouvre la tâche sans passer par le
 * glisser ni par le formulaire. Elle n'apparaît qu'au survol pour ne pas
 * charger le tableau — mais toujours au toucher, où rien ne survole, au focus
 * clavier, et sur une carte déjà terminée, dont elle porte la coche.
 *
 * La poignée de gauche est la seule zone qui déclenche le glisser : sans elle,
 * cliquer sur le titre ou sur l'assigné amorcerait un déplacement au lieu
 * d'ouvrir la tâche ou le menu. La bordure gauche colore l'urgence — rouge en
 * retard, ambre aujourd'hui — pour que l'état se lise sans parcourir les dates.
 */
export function TaskCard({
  task,
  colleagues,
  canWrite,
  onOpen,
  onAssign,
  onToggleDone,
  overlay = false,
}: {
  task: Task;
  colleagues: Colleague[];
  canWrite: boolean;
  onOpen: (task: Task) => void;
  onAssign: (task: Task, assigneeId: string | null) => void;
  /** Termine la tâche, ou la rouvre si elle l'est déjà. */
  onToggleDone: (task: Task) => void;
  overlay?: boolean;
}) {
  const sortable = useSortable({ id: task.id, disabled: !canWrite || overlay });
  const done = task.status === "terminee";
  const due = describeDue(task.due_at, done);

  const customers = task.targets.filter(
    (t): t is typeof t & { customer_id: string } => Boolean(t.customer_id),
  );
  const projects = task.targets.filter((t) => t.project_id);
  const size = task.size ? TASK_SIZE[task.size] : null;

  return (
    <li
      ref={overlay ? undefined : sortable.setNodeRef}
      style={
        overlay
          ? undefined
          : {
              transform: CSS.Translate.toString(sortable.transform),
              transition: sortable.transition,
            }
      }
      className={cn(
        "bg-card group relative flex gap-2 rounded-lg border border-l-3 p-3",
        "shadow-sm transition-shadow hover:shadow-md",
        DUE_ACCENT[due.tone],
        // La carte d'origine s'efface pendant le glisser : c'est le calque
        // flottant qui suit le curseur.
        sortable.isDragging && "opacity-30",
        overlay && "rotate-2 cursor-grabbing shadow-xl",
      )}
    >
      {canWrite && (
        <button
          type="button"
          aria-label={`Déplacer « ${task.title} »`}
          className={cn(
            "text-muted-foreground/30 hover:text-muted-foreground -ml-1 shrink-0 cursor-grab",
            "touch-none self-start pt-0.5 transition-colors active:cursor-grabbing",
          )}
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        {/*
          D'où vient cette tâche, et pour qui.

          Une affaire mène à la **fiche** dont elle relève : c'est là qu'on
          trouve le téléphone du client quand la tâche est « rappeler ». Sans
          `owner_id`, l'étiquette n'ouvrait rien.
        */}
        <div className="flex items-start justify-between gap-2">
          <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.7rem]">
            {customers.map((target) => (
              <Link
                key={target.id}
                href={customerHref(target.customer_id)}
                onPointerDown={(event) => event.stopPropagation()}
                className="hover:text-foreground flex min-w-0 items-center gap-1"
              >
                <UserRoundIcon className="size-3 shrink-0" />
                <span className="truncate font-medium">{target.label}</span>
              </Link>
            ))}
            {projects.map((target) => {
              const inner = (
                <>
                  <BriefcaseIcon className="size-3 shrink-0" />
                  <span className="truncate">{target.reference || target.label}</span>
                </>
              );
              return target.owner_id ? (
                <Link
                  key={target.id}
                  href={customerHref(target.owner_id)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="hover:text-foreground flex min-w-0 items-center gap-1"
                >
                  {inner}
                </Link>
              ) : (
                <span key={target.id} className="flex min-w-0 items-center gap-1">
                  {inner}
                </span>
              );
            })}
            {customers.length === 0 && projects.length === 0 && (
              <span className="text-muted-foreground/50">Sans client</span>
            )}
          </div>

          <AssigneePicker
            assigneeId={task.assignee_id}
            assigneeName={task.assignee_name}
            colleagues={colleagues}
            disabled={!canWrite || overlay}
            onChange={(assigneeId) => onAssign(task, assigneeId)}
          />
        </div>

        <div className="mt-1 flex items-start gap-1.5">
          {canWrite && !overlay && (
            <button
              type="button"
              data-demo="task-card-done"
              aria-label={done ? `Rouvrir « ${task.title} »` : `Terminer « ${task.title} »`}
              aria-pressed={done}
              // Ni glisser ni ouverture : la case a son propre geste.
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onToggleDone(task);
              }}
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition",
                "focus-visible:border-ring focus-visible:ring-ring/50 outline-none focus-visible:ring-3",
                done
                  ? "bg-success border-success text-background"
                  : cn(
                      "border-input hover:border-success hover:text-success text-transparent",
                      "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
                      "focus-visible:opacity-100 pointer-coarse:opacity-100",
                    ),
              )}
            >
              <CheckIcon className="size-3" />
            </button>
          )}
          <button
            type="button"
            data-demo="task-card-open"
            onClick={() => onOpen(task)}
            className="hover:text-primary block min-w-0 flex-1 text-left text-sm leading-snug font-medium"
          >
            <span className={cn(done && "text-muted-foreground line-through")}>
              {task.title}
            </span>
          </button>
        </div>

        {task.body && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
            {task.body}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {task.priority !== "normale" && !done && (
            <Pill
              className={
                task.priority === "haute"
                  ? "bg-danger-soft text-danger"
                  : "bg-neutral-soft text-neutral"
              }
            >
              {/* L'émoji est masqué au lecteur d'écran, comme celui de la
                  taille juste à côté : il annoncerait « mountain Haute ». Le
                  mot, lui, porte toute l'information — aucune pastille du
                  tableau ne se distingue par la seule couleur. */}
              <span aria-hidden>{task.priority === "haute" ? "⛰️" : "🍃"}</span>{" "}
              {TASK_PRIORITY[task.priority].label}
            </Pill>
          )}

          {size && (
            <Pill className="bg-muted text-muted-foreground" demo="task-size">
              <span aria-hidden>{size.icon}</span> {size.label}
            </Pill>
          )}

          <Pill className={cn("bg-transparent px-0", DUE_TEXT[due.tone])}>
            <span title={due.title} className="flex items-center gap-1">
              {due.tone === "overdue" ? (
                <AlertTriangleIcon className="size-3 shrink-0" />
              ) : done ? (
                <CheckIcon className="size-3 shrink-0" />
              ) : (
                <CalendarClockIcon className="size-3 shrink-0" />
              )}
              <span className="truncate">{due.label}</span>
            </span>
          </Pill>

          {task.auto_rule && <AutoTaskBadge rule={task.auto_rule} />}

          {/* Une tâche qui traîne sans échéance mérite qu'on le voie. */}
          {!task.due_at && !done && (
            <Pill className="text-muted-foreground/50 bg-transparent px-0">
              <span title={`Créée le ${new Date(task.created_at).toLocaleDateString("fr-FR")}`}>
                créée {formatRelative(task.created_at)}
              </span>
            </Pill>
          )}
        </div>
      </div>
    </li>
  );
}

/** Une pastille de la rangée du bas : même forme pour toutes, la couleur dit quoi. */
function Pill({
  className,
  demo,
  children,
}: {
  className?: string;
  /** Marque la zone pour une démo (`data-demo`), quand il y a lieu. */
  demo?: string;
  children: ReactNode;
}) {
  return (
    <span
      data-demo={demo}
      className={cn(
        "flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}
