"use client";

import { useState } from "react";
import { AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_SOFT, TONE_TEXT } from "@/shared/ui/panel";
import { leadProject, nextAction, readCycle } from "../lib/cycle";
import { readJalons } from "../lib/jalons";
import { ProjectCycle } from "./project-cycle";
import type { CustomerDetail } from "../lib/types";

/**
 * La ligne qui dit, en haut de la fiche, ce que cette relation demande.
 *
 * Une fiche porte plusieurs affaires ; l'en-tête n'a de place que pour une
 * phrase. On prend celle qui alerte, sinon la plus engagée — parce que la
 * question posée en ouvrant une fiche est « dois-je faire quelque chose ? » et
 * qu'y répondre demandait jusqu'ici de déplier chaque affaire.
 *
 * Les affaires closes ne parlent jamais ici : elles ne demandent rien.
 */
export function CustomerHeadline({
  customer,
  className,
}: {
  customer: CustomerDetail;
  className?: string;
}) {
  const [now] = useState(() => Date.now());

  const reads = customer.projects.map((project) => {
    const quotes = customer.quotes.filter((quote) => quote.project_id === project.id);
    const interactions = customer.interactions.filter((entry) => entry.project_id === project.id);
    const jalons = readJalons(project.id, quotes, customer.milestones, project);
    const points = readCycle(project, quotes, interactions, jalons, now);
    return { project, quotes, action: nextAction(points, project, quotes, jalons, now), points };
  });

  const lead = leadProject(reads);
  if (!lead) return null;

  const read = reads.find((entry) => entry.project.id === lead.project.id)!;
  const { action, points } = read;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      <span
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
          action.alert ? TONE_SOFT[action.tone] : "bg-muted text-muted-foreground",
        )}
      >
        {action.alert && <AlertTriangleIcon className={cn("size-3.5", TONE_TEXT[action.tone])} />}
        <span className="font-medium">{action.title}</span>
      </span>

      {customer.projects.length > 1 && (
        <span className="text-muted-foreground/70 truncate text-xs">
          sur « {read.project.label} », {customer.projects.length - 1} autre
          {customer.projects.length > 2 ? "s" : ""} affaire
          {customer.projects.length > 2 ? "s" : ""}
        </span>
      )}

      <ProjectCycle points={points} size="mini" className="ml-auto shrink-0" />
    </div>
  );
}
