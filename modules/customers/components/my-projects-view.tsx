"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { Bar } from "@/shared/ui/loading";
import { formatRelative } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import { INTERVENTION_SCOPE, PROJECT_STAGE } from "../lib/labels";
import { EnumBadge } from "./enum-badge";
import type { MyProject } from "../lib/types";

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
      .listMyProjects(100, controller.signal)
      .then((page) => {
        setItems(page.items);
        setError(null);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Mes dossiers</h1>
        <p className="text-muted-foreground text-sm">
          Les affaires qui vous sont confiées, du plus récemment touché au plus
          ancien. Les affaires réalisées n&apos;y figurent pas.
        </p>
      </header>

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
      ) : (
        <Card className="divide-y p-0">
          {items.map((project) => (
            <MyProjectRow key={project.id} project={project} />
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
function MyProjectRow({ project }: { project: MyProject }) {
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
      href={`/customers/${project.customer_id}`}
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
        </div>
        <div className="text-muted-foreground truncate text-xs">
          {project.label}
          {site && ` · ${site}`}
        </div>
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
