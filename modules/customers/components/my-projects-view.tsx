"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { Bar } from "@/shared/ui/loading";
import { formatDate, formatRelative } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import { INTERVENTION_SCOPE, PROJECT_STAGE } from "../lib/labels";
import { deadlineOf, type Deadline } from "../lib/mission";
import type { Tone } from "../lib/labels";
import { EnumBadge } from "./enum-badge";
import type { MyProject } from "../lib/types";
import { customerHref } from "@/shared/lib/routes";

/** Le plafond d'une page côté API : la liste arrive triée par urgence. */
const LIMIT = 200;

/** Où en est un dossier, dans l'ordre même où le serveur les trie. */
type Urgency = "retard" | "sans_action" | "suivi";

type Role = "responsable" | "ingenieur" | "dessinateur";

const URGENCY_FILTERS: { value: Exclude<Urgency, "suivi"> | null; label: string }[] = [
  { value: null, label: "Tous" },
  { value: "retard", label: "En retard" },
  { value: "sans_action", label: "Sans prochaine action" },
];

const ROLE_FILTERS: { value: Role | null; label: string }[] = [
  { value: null, label: "Tous les rôles" },
  { value: "responsable", label: "Responsable" },
  { value: "ingenieur", label: "Ingénieur" },
  { value: "dessinateur", label: "Dessinateur" },
];

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

/**
 * L'urgence d'un dossier, avec la règle même qui a trié la liste côté serveur
 * (`ListProjectsForUser`) : une prochaine action échue, ou un délai dépassé
 * tant que la mission n'est pas rendue — `deadlineOf`. Les deux doivent
 * évoluer ensemble.
 */
function urgencyOf(project: MyProject, deadline: Deadline | null): Urgency {
  if (project.next_task?.is_overdue || deadline?.late) return "retard";
  if (!project.next_task) return "sans_action";
  return "suivi";
}

function holds(project: MyProject, role: Role): boolean {
  if (role === "responsable") return project.is_manager;
  if (role === "ingenieur") return project.is_engineer;
  return project.is_drafter;
}

/**
 * « Mes dossiers » — ce qui m'attend, et rien d'autre.
 *
 * Le CRM disait ce qu'il y avait à faire sans jamais dire par qui : trois
 * tâches pour trois cent soixante-quinze fiches. Cet écran est l'autre moitié
 * de la réponse — une fois qu'un dossier porte un responsable, il faut un
 * endroit où celui-ci le retrouve sans traverser la liste des fiches.
 *
 * **L'identité vient du jeton**, pas d'un filtre : il n'y a rien à choisir, et
 * donc aucune façon de lire les dossiers d'un autre depuis cet écran.
 *
 * Les affaires réalisées en sont exclues par le serveur : elles ne sont plus du
 * travail. Elles restent lisibles depuis la fiche du client.
 */
export function MyProjectsView() {
  const [items, setItems] = useState<MyProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .listMyProjects(LIMIT, controller.signal)
      .then((page) => {
        setItems(page.items);
        setError(null);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      });
    return () => controller.abort();
  }, []);

  // L'instant est lu une fois : deux lignes ne se jugent pas sur deux horloges.
  const [now] = useState(() => Date.now());
  const [urgency, setUrgency] = useState<Urgency | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  const rows = useMemo(
    () =>
      (items ?? []).map((project) => {
        const deadline = deadlineOf(project, project.is_delivered, now);
        return { project, deadline, urgency: urgencyOf(project, deadline) };
      }),
    [items, now],
  );
  const counts = useMemo(() => {
    const byRole = rows.filter((row) => !role || holds(row.project, role));
    return {
      retard: byRole.filter((row) => row.urgency === "retard").length,
      sans_action: byRole.filter((row) => row.urgency === "sans_action").length,
      all: byRole.length,
    };
  }, [rows, role]);
  const visible = rows.filter(
    (row) => (!urgency || row.urgency === urgency) && (!role || holds(row.project, role)),
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Mes dossiers</h1>
        <p className="text-muted-foreground text-sm">
          Les affaires qui vous sont confiées, les plus urgentes d&apos;abord :
          en retard, puis sans prochaine action, puis par échéance. Les
          affaires réalisées n&apos;y figurent pas.
        </p>
      </header>

      {items !== null && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" data-demo="my-projects-filters">
          <nav className="bg-muted flex rounded-lg p-0.5" aria-label="Urgence">
            {URGENCY_FILTERS.map((option) => {
              const active = urgency === option.value;
              const count = option.value ? counts[option.value] : counts.all;
              return (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setUrgency(option.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    active ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                  <span
                    className={cn(
                      "tabular-nums",
                      option.value === "retard" && count > 0 && "text-danger",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
          <nav className="bg-muted flex flex-wrap rounded-lg p-0.5" aria-label="Rôle">
            {ROLE_FILTERS.map((option) => {
              const active = role === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setRole(option.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    active ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* La liste est bornée : elle le dit plutôt que de s'arrêter en silence.
          Le tri étant fait par le serveur, ce qui manque est le moins urgent. */}
      {items !== null && items.length >= LIMIT && (
        <p className="bg-warning-soft text-warning rounded-lg px-3 py-2 text-sm">
          Les {LIMIT} dossiers les plus urgents sont affichés ; les suivants
          restent lisibles depuis la liste des fiches.
        </p>
      )}

      {error && <ErrorNotice message={error} />}

      {items === null ? (
        /* La teinte est celle de l'écran — indigo, comme les fiches — et non
           celle de la donnée qu'on attend. */
        <Card className="flex flex-col gap-3 p-4">
          <Bar hue="indigo" />
          <Bar hue="indigo" className="w-2/3" />
          <Bar hue="indigo" className="w-1/2" />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="Aucun dossier ne vous est confié"
            description="Un responsable, un ingénieur ou un dessinateur se nomme depuis l'affaire, dans la fiche du client."
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            title="Aucun dossier ne correspond"
            description="Élargissez les filtres pour revoir tous vos dossiers."
          />
        </Card>
      ) : (
        <Card className="divide-y p-0" data-demo="my-projects-list">
          {visible.map((row) => (
            <MyProjectRow
              key={row.project.id}
              project={row.project}
              deadline={row.deadline}
              urgency={row.urgency}
            />
          ))}
        </Card>
      )}
    </div>
  );
}

/**
 * Une ligne dit quatre choses : chez qui, quoi, où j'en suis, et à quel titre.
 *
 * Le rôle tenu est le seul de ces quatre à ne pas exister ailleurs dans le CRM,
 * et c'est celui qui change ce qu'on vient y faire : on ne rouvre pas un
 * dossier de la même façon selon qu'on le suit ou qu'on le dessine.
 */
function MyProjectRow({
  project,
  deadline,
  urgency,
}: {
  project: MyProject;
  deadline: Deadline | null;
  urgency: Urgency;
}) {
  const roles = [
    project.is_manager && "responsable",
    project.is_engineer && "ingénieur",
    project.is_drafter && "dessinateur",
  ].filter(Boolean) as string[];

  const site = [project.site_postal_code, project.site_city]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={`${customerHref(project.customer_id)}&affaire=${project.id}`}
      className="hover:bg-muted/30 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">
            {project.customer_name}
          </span>
          <span className="text-muted-foreground font-mono text-[0.65rem]">
            {project.customer_reference}
          </span>
          {urgency === "retard" && (
            <span className="bg-danger-soft text-danger rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium">
              En retard
            </span>
          )}
        </div>
        <div className="text-muted-foreground truncate text-xs">
          {project.label}
          {site && ` · ${site}`}
        </div>
        {/* La prochaine action : ce qu'on vient chercher en ouvrant ses dossiers. */}
        {project.next_task ? (
          <div className={cn("truncate text-xs", project.next_task.is_overdue ? "text-danger" : "text-foreground")}>
            → {project.next_task.title}
            {project.next_task.due_at && ` · ${project.next_task.is_overdue ? "en retard depuis le" : "pour le"} ${formatDate(project.next_task.due_at)}`}
          </div>
        ) : (
          <div className="text-warning truncate text-xs">Aucune prochaine action assignée</div>
        )}
        {/* Le délai de l'affaire, dans les mots de la fiche : c'est lui, avec
            la tâche, qui a placé la ligne là où elle est. */}
        {deadline && (
          <div className={cn("truncate text-xs", TONE_TEXT[deadline.tone])}>{deadline.label}</div>
        )}
      </div>

      {project.scope && (
        <span className="text-muted-foreground bg-muted hidden rounded-md px-1.5 py-0.5 text-[0.65rem] md:inline-block">
          {INTERVENTION_SCOPE[project.scope].label}
        </span>
      )}

      {/* Le rôle tenu, dans les mots qu'on emploie pour le dire. */}
      <span
        className={cn(
          "rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium",
          project.is_manager
            ? "bg-info-soft text-info"
            : "bg-neutral-soft text-neutral",
        )}
      >
        {roles.join(" · ")}
      </span>

      <EnumBadge value={project.stage} entries={PROJECT_STAGE} />

      <span className="text-muted-foreground w-24 shrink-0 text-right text-xs">
        {formatRelative(project.updated_at)}
      </span>

      {project.scope === null && (
        <AlertTriangleIcon
          className="text-warning size-4 shrink-0"
          aria-label="Type de projet à renseigner"
        />
      )}
    </Link>
  );
}
