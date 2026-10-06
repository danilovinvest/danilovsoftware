"use client";

import Link from "next/link";
import { formatAmount, plural } from "@/shared/lib/format";
import { interventions } from "../lib/building-labels";
import { projectMetier } from "../lib/cycle";
import { PROJECT_STAGE } from "../lib/labels";
import { projectReference } from "../lib/mission";
import type { Project, Quote } from "../lib/types";
import { EnumBadge } from "./enum-badge";

/**
 * L'historique des interventions sur un immeuble, de la plus récente à la plus
 * ancienne : l'étude d'une société et les travaux de l'autre sur la même ligne
 * de temps, affaires archivées comprises — c'est de l'histoire, pas une liste
 * de travail.
 *
 * Une affaire appartient à sa société : un compte lié ne lit que les siennes,
 * et l'écran dit combien l'autre en porte, sans rien en dire d'autre.
 */
export function BuildingHistory({
  customerId,
  projects,
  quotes,
  hidden,
}: {
  customerId: string;
  projects: Project[];
  quotes: Quote[];
  /** Les affaires hors du périmètre du compte. */
  hidden: number;
}) {
  const rows = interventions(projects);
  if (rows.length === 0 && hidden === 0) {
    return <p className="text-muted-foreground text-sm">Aucune intervention sur cet immeuble.</p>;
  }
  return (
    <div className="flex flex-col gap-2" data-demo="building-history">
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Les interventions sur l&apos;immeuble</caption>
            <thead className="text-muted-foreground bg-muted/40 text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Année</th>
                <th className="px-3 py-2 text-left font-medium">Intervention</th>
                <th className="px-3 py-2 text-left font-medium">Étape</th>
                <th className="px-3 py-2 text-right font-medium">Marché</th>
                <th className="px-3 py-2 text-right font-medium">Encaissé</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((project) => {
                const metier = projectMetier(
                  project,
                  quotes.filter((quote) => quote.project_id === project.id),
                );
                return (
                  <tr key={project.id} className={project.archived_at ? "text-muted-foreground" : undefined}>
                    <td className="px-3 py-2 tabular-nums">{project.year ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/customers/${customerId}?affaire=${project.id}`}
                        className="font-medium hover:underline"
                      >
                        {project.label}
                      </Link>
                      <div className="text-muted-foreground text-xs">
                        {[
                          projectReference(project.reference, metier),
                          metier === "etudes" ? "Étude — OMPT STRUCTURE" : "Travaux — OMPT GROUPE",
                          project.payer_name && `payé par ${project.payer_name}`,
                          project.archived_at && "archivée",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <EnumBadge value={project.stage} entries={PROJECT_STAGE} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatAmount(project.total_amount_ttc)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatAmount(project.collected_amount_ttc)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {hidden > 0 && (
        <p className="text-muted-foreground text-xs">
          {plural(hidden, "autre intervention relève", "autres interventions relèvent")} de
          l&apos;autre société du groupe.
        </p>
      )}
    </div>
  );
}
