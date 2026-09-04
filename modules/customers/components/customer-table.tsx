"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { AlertTriangleIcon, ChevronRightIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TONE_SOFT, TONE_TEXT } from "@/shared/ui/panel";
import { formatAmount, formatPhone } from "@/shared/lib/format";
import { CUSTOMER_SOURCE, PROJECT_OUTCOME } from "../lib/labels";
import { leadProject, nextAction, readCycle, type NextAction } from "../lib/cycle";
import { readJalons } from "../lib/jalons";
import { EnumBadge } from "./enum-badge";
import { ProjectCycle } from "./project-cycle";
import type { CustomerListItem, ProjectSummary } from "../lib/types";

const COLUMNS = 8;

/**
 * La liste des fiches, relue autour du cycle.
 *
 * Elle disait qui est qui — nom, ville, source, nombre d'affaires. Elle dit
 * maintenant **où on en est et ce qu'il faut faire**, parce que c'est la
 * question qu'on se pose en l'ouvrant. Un nombre d'affaires ne se compare pas
 * d'une ligne à l'autre ; « 47 jours sans réponse » se compare tout seul.
 *
 * La liste ne transporte ni devis ni échanges : le cycle s'y lit sur l'étape et
 * la dernière relance. C'est moins précis que sur la fiche, et volontairement :
 * un aller-retour par ligne pour gagner quelques jours d'exactitude coûterait
 * trente requêtes à l'ouverture.
 */
export function CustomerTable({
  items,
  loading,
}: {
  items: CustomerListItem[];
  loading: boolean;
}) {
  // Les affaires arrivent déjà avec la ligne du client : déplier ne déclenche
  // aucune requête.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [now] = useState(() => Date.now());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      {/* En-têtes de colonne à la Twenty : une ligne basse, en gris
          tertiaire, qui ne rivalise pas avec le contenu. */}
      <Table className="min-w-280 [&_thead_th]:text-muted-foreground [&_thead_th]:h-8 [&_thead_th]:text-xs [&_thead_th]:font-medium">
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Fiche</TableHead>
            <TableHead>Coordonnées</TableHead>
            <TableHead className="w-30">Où en est-on</TableHead>
            <TableHead>Prochaine action</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Signé TTC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && items.length === 0
            ? Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={COLUMNS}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : items.map((customer) => {
                const open = expanded.has(customer.id);
                const hasProjects = customer.projects.length > 0;
                const reads = customer.projects.map((project) => read(project, now));
                const lead = leadProject(reads);

                return (
                  <Fragment key={customer.id}>
                    <TableRow className={cn(open && "bg-muted/40")}>
                      <TableCell className="pr-0">
                        {hasProjects && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-expanded={open}
                            aria-label={`${open ? "Replier" : "Déplier"} les affaires de ${customer.display_name}`}
                            onClick={() => toggle(customer.id)}
                          >
                            <ChevronRightIcon
                              className={cn("transition-transform", open && "rotate-90")}
                            />
                          </Button>
                        )}
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-medium hover:underline"
                        >
                          {customer.display_name}
                        </Link>
                        <p className="text-muted-foreground truncate font-mono text-xs">
                          {customer.reference}
                          {customer.city && ` · ${customer.city}`}
                        </p>
                      </TableCell>

                      <TableCell className="text-muted-foreground text-xs">
                        {customer.email && <div className="truncate">{customer.email}</div>}
                        {customer.phone && <div>{formatPhone(customer.phone)}</div>}
                        {!customer.email && !customer.phone && "—"}
                      </TableCell>

                      <TableCell>
                        {lead ? (
                          <ProjectCycle
                            points={reads.find((r) => r.project.id === lead.project.id)!.points}
                            size="mini"
                          />
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">aucune affaire</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {lead ? <ActionCell action={lead.action} /> : "—"}
                      </TableCell>

                      <TableCell>
                        <EnumBadge value={customer.source} entries={CUSTOMER_SOURCE} />
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {customer.won_amount_ttc === "0"
                          ? "—"
                          : formatAmount(customer.won_amount_ttc)}
                      </TableCell>
                    </TableRow>

                    {open &&
                      reads.map(({ project, action, points }) => (
                        <TableRow
                          key={project.id}
                          className="bg-muted/40 hover:bg-muted/60 border-0"
                        >
                          <TableCell />
                          <TableCell className="py-2">
                            <div className="border-border ml-1 border-l pl-3">
                              <Link
                                href={`/customers/${customer.id}`}
                                className="text-sm hover:underline"
                              >
                                {project.label}
                              </Link>
                              <p className="text-muted-foreground text-xs">
                                {project.site_city || "chantier non renseigné"} ·{" "}
                                {project.quote_count} devis
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            {project.outcome && (
                              <EnumBadge value={project.outcome} entries={PROJECT_OUTCOME} />
                            )}
                            {project.outcome_note && (
                              <p className="text-muted-foreground mt-1 text-xs">
                                {project.outcome_note}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="py-2">
                            <ProjectCycle points={points} size="mini" />
                          </TableCell>
                          <TableCell className="py-2">
                            <ActionCell action={action} />
                          </TableCell>
                          <TableCell className="py-2" />
                          <TableCell className="py-2 text-right tabular-nums">
                            {project.total_amount_ttc === "0"
                              ? "—"
                              : formatAmount(project.total_amount_ttc)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                );
              })}
        </TableBody>
      </Table>
    </div>
  );
}

/** La phrase du moment : teintée seulement quand elle réclame quelque chose. */
function ActionCell({ action }: { action: NextAction }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {action.alert && (
        <AlertTriangleIcon className={cn("size-3.5 shrink-0", TONE_TEXT[action.tone])} />
      )}
      <span
        className={cn(
          "truncate rounded-[4px] text-xs",
          action.alert ? cn(TONE_SOFT[action.tone], "px-1.5 py-0.5 font-medium") : "text-muted-foreground",
        )}
        title={action.detail}
      >
        {action.title}
      </span>
    </div>
  );
}

/**
 * Lire une affaire depuis la ligne de liste.
 *
 * Sans devis ni échange, les jalons partent vides et le cycle se rabat sur
 * l'étape enregistrée. C'est le compromis assumé : la liste situe, la fiche
 * détaille.
 */
function read(project: ProjectSummary, now: number) {
  const jalons = readJalons(project.id, [], undefined, now);
  const points = readCycle(project, [], [], jalons, now);
  return {
    project,
    points,
    quotes: [],
    action: nextAction(points, project, [], jalons, now),
  };
}
