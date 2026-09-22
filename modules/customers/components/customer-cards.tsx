"use client";

import Link from "next/link";
import { customerHref } from "@/shared/lib/routes";
import { Bar } from "@/shared/ui/loading";
import { formatAmount } from "@/shared/lib/format";
import { CUSTOMER_SOURCE } from "../lib/labels";
import type { NextAction } from "../lib/cycle";
import type { CustomerListItem, ProjectSummary, Review } from "../lib/types";
import { EnumBadge } from "./enum-badge";
import { ProjectCycle } from "./project-cycle";
import { ActionCell, IssuerBadge, PhoneLink, ReviewBox, readListProject } from "./customer-list-parts";

/** Une fiche lue pour la liste, telle que le tableau la prépare. */
export type ListRow = {
  customer: CustomerListItem;
  reads: ReturnType<typeof readListProject>[];
  lead: { project: ProjectSummary; action: NextAction } | null;
};

/**
 * La liste des fiches en cartes, sous 768 pixels (issue 85).
 *
 * Le tableau exige 1 120 pixels : sur un téléphone de 390, il défilait dans son
 * cadre et l'on ne voyait jamais le nom et la prochaine action ensemble. Une
 * carte empile ce que la ligne alignait, dans l'ordre où on le lit — qui, où en
 * est-on, que faire — puis le numéro à appeler. Le détail des affaires reste
 * dans la fiche : déplier une carte sur un téléphone ferait défiler un écran
 * entier pour une seule fiche.
 */
export function CustomerCards({
  rows,
  loading,
  reviews,
  canWrite,
  onReviewChanged,
}: {
  rows: ListRow[];
  loading: boolean;
  reviews: Record<string, Review>;
  canWrite: boolean;
  onReviewChanged: (customerId: string, next: Review) => void;
}) {
  if (loading && rows.length === 0) {
    return (
      <ul className="divide-border divide-y md:hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} className="space-y-2 px-4 py-3">
            <Bar hue="indigo" className="h-3.5 w-2/3" />
            <Bar className="h-2 w-1/3" />
            <Bar className="h-2.5 w-3/4" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul data-demo="fiche-cartes" className="divide-border divide-y md:hidden">
      {rows.map(({ customer, reads, lead }) => {
        const review = reviews[customer.id] ?? customer.review;
        const points = lead ? reads.find((r) => r.project.id === lead.project.id)?.points : null;
        return (
          <li key={customer.id} className="min-w-0 space-y-2 px-4 py-3">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={customerHref(customer.id)}
                  className="font-medium break-words hover:underline"
                >
                  {customer.display_name}
                </Link>
                <IssuerBadge issuer={customer.issuer} />
                <p className="text-muted-foreground truncate font-mono text-xs">
                  {customer.reference}
                  {customer.city && ` · ${customer.city}`}
                </p>
              </div>
              {customer.won_amount_ttc !== "0" && (
                <span className="shrink-0 text-sm tabular-nums">
                  {formatAmount(customer.won_amount_ttc)}
                </span>
              )}
            </div>

            {lead && points ? (
              <div className="min-w-0 space-y-1.5">
                <ProjectCycle points={points} size="mini" />
                <ActionCell action={lead.action} />
              </div>
            ) : (
              <p className="text-muted-foreground/50 text-xs">aucun projet</p>
            )}

            <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {customer.phone && <PhoneLink phone={customer.phone} className="text-sm" />}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="min-w-0 truncate hover:underline">
                  {customer.email}
                </a>
              )}
              <EnumBadge value={customer.source} entries={CUSTOMER_SOURCE} />
            </div>

            <div className="text-muted-foreground flex items-center gap-4 text-xs">
              <label className="inline-flex items-center gap-1.5">
                <ReviewBox
                  customerId={customer.id}
                  name={customer.display_name}
                  review={review}
                  field="verified"
                  editable={canWrite}
                  onChanged={(next) => onReviewChanged(customer.id, next)}
                />
                Vérifiée
              </label>
              <label className="inline-flex items-center gap-1.5">
                <ReviewBox
                  customerId={customer.id}
                  name={customer.display_name}
                  review={review}
                  field="completed"
                  editable={canWrite}
                  onChanged={(next) => onReviewChanged(customer.id, next)}
                />
                Complète
              </label>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
