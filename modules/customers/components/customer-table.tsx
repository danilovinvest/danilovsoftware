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
import { Bar } from "@/shared/ui/loading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermission } from "@/modules/auth";
import { cn } from "@/lib/utils";
import { TONE_SOFT, TONE_TEXT } from "@/shared/ui/panel";
import { formatAmount, formatDate, formatPhone } from "@/shared/lib/format";
import * as api from "../lib/api";
import { CUSTOMER_SOURCE, PROJECT_OUTCOME } from "../lib/labels";
import {
  leadProject,
  nextAction,
  readCycle,
  type Metier,
  type NextAction,
} from "../lib/cycle";
import { useScope } from "@/modules/group";
import { readJalons } from "../lib/jalons";
import { EnumBadge } from "./enum-badge";
import { ProjectCycle } from "./project-cycle";
import type { CustomerListItem, ProjectSummary, Review } from "../lib/types";


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
  const canWrite = usePermission("customers:write");
  // Sans devis dans la liste, le périmètre est le meilleur indice du métier :
  // en mode STRUCTURE ce sont des études qu'on regarde, pas des chantiers.
  const scope = useScope();
  const metier: Metier = scope === "ompt-structure" ? "etudes" : "travaux";

  /*
    Les cases cochées pendant la session, par-dessus ce que le serveur a servi.

    Sans cela, cocher demanderait de recharger toute la liste pour voir la coche
    apparaître : une page qui se reconstruit sous le curseur alors qu'on
    descend une colonne de deux cents cases. L'écart avec le serveur ne dure que
    le temps de la réponse, et c'est nous qui l'avons écrit.
  */
  const [reviews, setReviews] = useState<Record<string, Review>>({});

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
            : items.map((customer) => {
                const open = expanded.has(customer.id);
                const hasProjects = customer.projects.length > 0;
                const reads = customer.projects.map((project) =>
                  read(project, now, metier),
                );
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

                      <ReviewCell
                        customerId={customer.id}
                        name={customer.display_name}
                        review={reviews[customer.id] ?? customer.review}
                        field="verified"
                        editable={canWrite}
                        onChanged={(next) =>
                          setReviews((current) => ({ ...current, [customer.id]: next }))
                        }
                      />
                      <ReviewCell
                        customerId={customer.id}
                        name={customer.display_name}
                        review={reviews[customer.id] ?? customer.review}
                        field="completed"
                        editable={canWrite}
                        onChanged={(next) =>
                          setReviews((current) => ({ ...current, [customer.id]: next }))
                        }
                      />
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
  );
}

/*
Une case de relecture.

Deux crans indépendants, et le CRM ne les enchaîne pas : déclarer une fiche
complète sans l'avoir cochée « vérifiée » est le droit de celui qui relit, pas
une incohérence à corriger dans son dos.

La coche part au serveur seule — jamais les deux à la fois — pour qu'un collègue
qui relit la même fiche au même moment ne se fasse pas décocher.
*/
function ReviewCell({
  customerId,
  name,
  review,
  field,
  editable,
  onChanged,
}: {
  customerId: string;
  name: string;
  review: Review;
  field: "verified" | "completed";
  editable: boolean;
  onChanged: (next: Review) => void;
}) {
  const [pending, setPending] = useState(false);
  const at = field === "verified" ? review.verified_at : review.completed_at;
  const by = field === "verified" ? review.verified_by_name : review.completed_by_name;
  const quoi = field === "verified" ? "Première vérification faite" : "Fiche complète";

  async function toggle(next: boolean) {
    setPending(true);
    try {
      onChanged(await api.setCustomerReview(customerId, { [field]: next }));
    } finally {
      setPending(false);
    }
  }

  return (
    <TableCell className="text-center">
      <span className="inline-flex">
        <Checkbox
          checked={at !== null}
          disabled={!editable || pending}
          onCheckedChange={(value) => toggle(value === true)}
          aria-label={`${quoi} : ${name}`}
          // La date et l'auteur au survol : « complète depuis quand, par qui »
          // est la première question posée le jour où elle ne l'est plus.
          title={
            at
              ? `${quoi} le ${formatDate(at)}${by ? ` par ${by}` : ""}`
              : quoi
          }
          className={cn(pending && "opacity-50")}
        />
      </span>
    </TableCell>
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
          "truncate rounded-md text-xs",
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
function read(project: ProjectSummary, now: number, metier: Metier) {
  const jalons = readJalons(project.id, [], undefined, project);
  const points = readCycle(project, [], [], jalons, now, metier);
  return {
    project,
    points,
    quotes: [],
    action: nextAction(points, project, [], jalons, now),
  };
}
