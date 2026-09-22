"use client";

import Link from "next/link";
import { customerHref } from "@/shared/lib/routes";
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
import { Bar } from "@/shared/ui/loading";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/modules/auth";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/shared/lib/format";
import { CUSTOMER_SOURCE, PROJECT_OUTCOME } from "../lib/labels";
import { leadProject, type Metier } from "../lib/cycle";
import { useScope } from "@/modules/group";
import { useCycleOrders } from "../hooks/use-cycle-orders";
import { EnumBadge } from "./enum-badge";
import { ProjectCycle } from "./project-cycle";
import { CustomerCards, type ListRow } from "./customer-cards";
import {
  ActionCell,
  IssuerBadge,
  PhoneLink,
  ReviewBox,
  SortButton,
  readListProject,
} from "./customer-list-parts";
import type { CustomerFilters, CustomerListItem, Review } from "../lib/types";

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
  issuer,
  sort = "name",
  onSort,
}: {
  items: CustomerListItem[];
  loading: boolean;
  /** La société choisie dans les filtres, quand l'adresse n'en fixe aucune. */
  issuer?: string;
  /** Le tri en cours, pour marquer l'en-tête qui le porte. */
  sort?: NonNullable<CustomerFilters["sort"]>;
  /** Absent, les en-têtes restent de simples intitulés. */
  onSort?: (sort: NonNullable<CustomerFilters["sort"]>) => void;
}) {
  // Les affaires arrivent déjà avec la ligne du client : déplier ne déclenche
  // aucune requête.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [now] = useState(() => Date.now());
  const canWrite = usePermission("customers:write");
  // Sans devis dans la liste, le périmètre est le meilleur indice du métier :
  // en mode STRUCTURE ce sont des études qu'on regarde, pas des chantiers.
  const scope = useScope();
  const metier: Metier =
    (scope === "tous" ? issuer : scope) === "ompt-structure" ? "etudes" : "travaux";
  const orders = useCycleOrders();

  /*
    Les cases cochées pendant la session, par-dessus ce que le serveur a servi.

    Sans cela, cocher demanderait de recharger toute la liste pour voir la coche
    apparaître : une page qui se reconstruit sous le curseur alors qu'on
    descend une colonne de deux cents cases. L'écart avec le serveur ne dure que
    le temps de la réponse, et c'est nous qui l'avons écrit.
  */
  const [reviews, setReviews] = useState<Record<string, Review>>({});

  function reviewChanged(customerId: string, next: Review) {
    setReviews((current) => ({ ...current, [customerId]: next }));
  }

  // Une lecture par fiche, partagée par le tableau et les cartes. Une affaire
  // archivée ne dit plus « où en est-on » : elle reste sur la fiche, repliée.
  const rows: ListRow[] = items.map((customer) => {
    const reads = customer.projects
      .filter((project) => !project.archived_at)
      .map((project) => readListProject(project, now, metier, orders));
    return { customer, reads, lead: leadProject(reads) };
  });

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <CustomerCards
        rows={rows}
        loading={loading}
        reviews={reviews}
        canWrite={canWrite}
        onReviewChanged={reviewChanged}
      />
      {/*
        Le tableau à partir de 768 pixels seulement : en dessous, les cartes
        prennent le relais (issue 85). Il garde son défilement propre entre 768
        et 1 120 pixels, où ses neuf colonnes ne tiennent pas encore.
      */}
      <div className="hidden w-full min-w-0 overflow-x-auto md:block">
        {/* En-têtes de colonne à la Twenty : une ligne basse, en gris
            tertiaire, qui ne rivalise pas avec le contenu. */}
        <Table className="min-w-280 [&_thead_th]:text-muted-foreground [&_thead_th]:h-8 [&_thead_th]:text-xs [&_thead_th]:font-medium">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>
                <SortButton
                  label="Fiche"
                  value="name"
                  fallback="recent"
                  current={sort}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead>Coordonnées</TableHead>
              <TableHead className="w-30">Où en est-on</TableHead>
              <TableHead>Prochaine action</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">
                <SortButton
                  label="Signé TTC"
                  value="amount"
                  fallback="name"
                  current={sort}
                  onSort={onSort}
                  align="right"
                />
              </TableHead>
              {/*
                Deux colonnes plutôt qu'une à deux cases : chacune porte son
                intitulé, et on descend une colonne de coches sans avoir à se
                rappeler laquelle des deux boîtes veut dire quoi.
              */}
              <TableHead className="w-16 text-center">Vérifiée</TableHead>
              <TableHead className="w-16 text-center">Complète</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0
              ? /*
                  Les colonnes gardent leurs largeurs pendant l'attente : une
                  barre unique en `colSpan` laissait le tableau se réorganiser
                  d'un coup à l'arrivée des données, et l'œil perdait la ligne
                  qu'il suivait.
                */
                Array.from({ length: 8 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell />
                    <TableCell>
                      <Bar hue="indigo" className="h-3.5 w-2/3" />
                      <Bar className="mt-1.5 h-2 w-1/3" />
                    </TableCell>
                    <TableCell>
                      <Bar className="h-2.5 w-4/5" />
                    </TableCell>
                    <TableCell>
                      <Bar className="h-2.5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Bar className="h-2.5 w-3/4" />
                    </TableCell>
                    <TableCell>
                      <Bar className="h-4 w-16 rounded-md" />
                    </TableCell>
                    <TableCell>
                      <Bar className="ml-auto h-2.5 w-16" />
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                ))
              : rows.map(({ customer, reads, lead }) => {
                  const open = expanded.has(customer.id);
                  const hasProjects = reads.length > 0;

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
                            href={customerHref(customer.id)}
                            className="font-medium hover:underline"
                          >
                            {customer.display_name}
                          </Link>
                          <IssuerBadge issuer={customer.issuer} />
                          <p className="text-muted-foreground truncate font-mono text-xs">
                            {customer.reference}
                            {customer.city && ` · ${customer.city}`}
                          </p>
                        </TableCell>

                        <TableCell className="text-muted-foreground text-xs">
                          {customer.email && <div className="truncate">{customer.email}</div>}
                          {customer.phone && (
                            <div>
                              <PhoneLink phone={customer.phone} />
                            </div>
                          )}
                          {!customer.email && !customer.phone && "—"}
                        </TableCell>

                        <TableCell>
                          {lead ? (
                            <ProjectCycle
                              points={reads.find((r) => r.project.id === lead.project.id)!.points}
                              size="mini"
                            />
                          ) : (
                            <span className="text-muted-foreground/50 text-xs">aucun projet</span>
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

                        {(["verified", "completed"] as const).map((field) => (
                          <TableCell key={field} className="text-center">
                            <ReviewBox
                              customerId={customer.id}
                              name={customer.display_name}
                              review={reviews[customer.id] ?? customer.review}
                              field={field}
                              editable={canWrite}
                              onChanged={(next) => reviewChanged(customer.id, next)}
                            />
                          </TableCell>
                        ))}
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
                                  href={customerHref(customer.id)}
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
                            {/* La relecture porte sur la fiche, pas sur l'affaire. */}
                            <TableCell className="py-2" />
                            <TableCell className="py-2" />
                          </TableRow>
                        ))}
                    </Fragment>
                  );
                })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
