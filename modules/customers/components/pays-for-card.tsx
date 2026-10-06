"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { plural } from "@/shared/lib/format";
import { PROJECT_STAGE } from "../lib/labels";
import type { PaysFor } from "../lib/types";

/**
 * « Règle pour » : les affaires que cette fiche paie pour d'autres
 * (migration 107).
 *
 * AGEFIM n'a pas d'affaire à elle : sans ce bloc, sa fiche ne disait rien de
 * l'argent qu'elle verse pour la SDC du Marot. Chaque affaire mène à sa fiche,
 * ouverte dessus, et un virement reçu d'ici s'y affecte (« Affecter… »). Les
 * affaires sont celles du périmètre du compte, comme partout.
 */
export function PaysForCard({ paysFor }: { paysFor: PaysFor }) {
  const pieces = (projectId: string) => paysFor.quotes.filter((q) => q.project_id === projectId).length;
  return (
    <Card className="gap-0 py-0" data-demo="fiche-pays-for">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-sm">Règle pour</CardTitle>
        <CardDescription className="text-xs">
          {plural(paysFor.projects.length, "affaire")} d’autres fiches, payées par celle-ci.
        </CardDescription>
      </CardHeader>
      <CardContent className="py-2 text-sm">
        <ul className="divide-y">
          {paysFor.projects.map((project) => (
            <li key={project.id} className="flex flex-wrap items-baseline gap-x-2 py-2">
              <Link
                href={`/customers/${project.customer_id}?affaire=${project.id}`}
                className="font-medium hover:underline"
              >
                {project.customer_name}
              </Link>
              <span className="text-muted-foreground min-w-0 flex-1 truncate">
                {project.reference && <span className="font-mono text-xs">{project.reference} · </span>}
                {project.label}
              </span>
              <span className="text-muted-foreground text-xs">
                {PROJECT_STAGE[project.stage]?.label ?? project.stage} ·{" "}
                {plural(pieces(project.id), "pièce")}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
