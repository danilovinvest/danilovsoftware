"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ChevronRightIcon } from "lucide-react";
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
import { formatAmount, formatDate, formatPhone } from "@/shared/lib/format";
import { CUSTOMER_SOURCE, PROJECT_OUTCOME, PROJECT_STAGE } from "../lib/labels";
import { EnumBadge } from "./enum-badge";
import { RelanceButton } from "./relance-button";
import type { CustomerListItem } from "../lib/types";

const COLUMNS = 8;

export function CustomerTable({
  items,
  loading,
  onChanged,
}: {
  items: CustomerListItem[];
  loading: boolean;
  onChanged: () => void;
}) {
  // Les affaires arrivent déjà avec la ligne du client : déplier ne déclenche
  // aucune requête.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto">
      {/* En-têtes de colonne à la Twenty : une ligne basse, en gris
          tertiaire, qui ne rivalise pas avec le contenu. */}
      <Table className="min-w-[64rem] [&_thead_th]:text-muted-foreground [&_thead_th]:h-8 [&_thead_th]:text-xs [&_thead_th]:font-medium">
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Fiche</TableHead>
            <TableHead>Coordonnées</TableHead>
            <TableHead>Ville</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Demande</TableHead>
            <TableHead className="text-right">Affaires</TableHead>
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
                        <p className="text-muted-foreground font-mono text-xs">
                          {customer.reference}
                          {customer.company_name && ` · ${customer.company_name}`}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {customer.email && <div>{customer.email}</div>}
                        {customer.phone && <div>{formatPhone(customer.phone)}</div>}
                        {!customer.email && !customer.phone && "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.city || "—"}
                      </TableCell>
                      <TableCell>
                        <EnumBadge value={customer.source} entries={CUSTOMER_SOURCE} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(customer.requested_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right tabular-nums">
                        {customer.projects.length}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {customer.won_amount_ttc === "0"
                          ? "—"
                          : formatAmount(customer.won_amount_ttc)}
                      </TableCell>
                    </TableRow>

                    {open &&
                      customer.projects.map((project) => (
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
                          <TableCell colSpan={2} className="py-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <EnumBadge value={project.stage} entries={PROJECT_STAGE} />
                              {project.outcome && (
                                <EnumBadge
                                  value={project.outcome}
                                  entries={PROJECT_OUTCOME}
                                />
                              )}
                            </div>
                            {project.outcome_note && (
                              <p className="text-muted-foreground mt-1 text-xs">
                                {project.outcome_note}
                              </p>
                            )}
                          </TableCell>
                          <TableCell colSpan={3} className="py-2">
                            <RelanceButton
                              projectId={project.id}
                              lastReminderAt={project.last_reminder_at}
                              onDone={onChanged}
                            />
                          </TableCell>
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
