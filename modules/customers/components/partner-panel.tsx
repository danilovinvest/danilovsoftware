"use client";

import Link from "next/link";
import { scopeParam, useScope } from "@/modules/group";
import { LIVE, useCached } from "@/shared/api/cache";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { TableSkeleton } from "@/shared/ui/loading";
import { formatAmount, formatDate, plural } from "@/shared/lib/format";
import { PARTNER_LINK, PARTNER_STATE, getPartnerSpace, type PartnerTotals } from "../lib/partners";
import { EnumBadge } from "./enum-badge";

/**
 * L'onglet « Partenaire » d'un prescripteur, d'un architecte ou d'un apporteur
 * (feuille de route du 29/09, phase 5).
 *
 * Le bureau d'études Dalmasso / INGENICE est de loin le premier apporteur
 * d'affaires, et rien ne le montrait : ses affaires vivaient chacune sur la
 * fiche de son client. Ici, toutes celles qu'il a apportées ou prescrites, ce
 * qu'elles sont devenues et ce qu'elles ont rapporté — plus les projets communs
 * et les recommandations, qui se lisent sans entrer dans le compte.
 *
 * Lu à l'ouverture de l'onglet seulement. La fiche est entière des deux côtés,
 * les affaires sont celles de la société affichée.
 */
export function PartnerPanel({ customerId }: { customerId: string }) {
  const issuer = scopeParam(useScope());
  const { data, error, isLoading, mutate } = useCached(
    `customers:partner-space:${customerId}:${issuer ?? ""}`,
    () => getPartnerSpace(customerId, issuer),
    LIVE,
  );

  if (error && !data) return <ErrorNotice message="Espace partenaire illisible." onRetry={() => void mutate()} />;
  if (isLoading && !data) return <TableSkeleton rows={4} columns={6} hue="indigo" />;
  if (!data) return null;
  if (data.projects.length === 0) {
    return (
      <EmptyState
        title="Aucune affaire"
        description="Une affaire entre ici quand cette fiche l'a apportée, ou quand « Partenaires… », en tête de ses devis, lui donne un rôle."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PartnerFigures totals={data.totals} />
      <div className="overflow-x-auto rounded-xl border" data-demo="partner-projects">
        <table className="w-full min-w-[760px] text-sm">
          <caption className="sr-only">Les affaires de ce partenaire</caption>
          <thead className="text-muted-foreground bg-muted/40 text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Affaire</th>
              <th className="px-3 py-2 text-left font-medium">Son rôle</th>
              <th className="px-3 py-2 text-left font-medium">Devenue</th>
              <th className="px-3 py-2 text-right font-medium">Marché</th>
              <th className="px-3 py-2 text-right font-medium">Facturé</th>
              <th className="px-3 py-2 text-right font-medium">Encaissé</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.projects.map((project) => (
              <tr key={project.project_id} className="align-top">
                <td className="px-3 py-2">
                  <Link
                    href={`/customers/${project.customer_id}?affaire=${project.project_id}`}
                    className="font-medium hover:underline"
                  >
                    {project.customer_name}
                  </Link>
                  <div className="text-muted-foreground text-xs break-words">
                    {[project.label, project.date && formatDate(project.date), project.archived && "archivée"]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {(Number(project.direct_fee) > 0 || project.note) && (
                    <div className="text-muted-foreground text-xs break-words">
                      {[
                        Number(project.direct_fee) > 0 &&
                          `${formatAmount(project.direct_fee)} réglés en direct au partenaire`,
                        project.note,
                      ]
                        .filter(Boolean)
                        .join(" — ")}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {project.roles.map((role) => (
                      <EnumBadge key={role} value={role} entries={PARTNER_LINK} />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <EnumBadge value={project.state} entries={PARTNER_STATE} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatAmount(project.market)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatAmount(project.invoiced)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatAmount(project.collected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Ce que le partenaire a amené, en quatre chiffres et une phrase. */
export function PartnerFigures({ totals }: { totals: PartnerTotals }) {
  const figures = [
    {
      label: "Apportées ou prescrites",
      value: String(totals.brought),
      hint: `${plural(totals.signed, "signée")} · ${plural(totals.lost, "perdue")} · ${totals.open} en cours`,
    },
    {
      label: "Transformation",
      value: totals.conversion_rate === null ? "—" : `${totals.conversion_rate} %`,
      hint:
        totals.conversion_rate === null
          ? "Aucune affaire tranchée"
          : `Sur ${plural(totals.signed + totals.lost, "affaire tranchée", "affaires tranchées")}`,
    },
    { label: "Marché signé", value: formatAmount(totals.market), hint: `Facturé ${formatAmount(totals.invoiced)}` },
    { label: "Encaissé", value: formatAmount(totals.collected), hint: "Sur les affaires qu'il a amenées" },
  ];
  const aside = [
    Number(totals.direct_fees) > 0 &&
      `${formatAmount(totals.direct_fees)} réglés directement au partenaire par les clients, hors chiffre d'OMPT`,
    totals.common > 0 && plural(totals.common, "projet commun", "projets communs"),
    totals.recommended > 0 && plural(totals.recommended, "recommandation"),
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2" data-demo="partner-figures">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.label} className="rounded-xl border px-3 py-2">
            <dt className="text-muted-foreground text-xs">{figure.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{figure.value}</dd>
            <dd className="text-muted-foreground text-xs">{figure.hint}</dd>
          </div>
        ))}
      </dl>
      {aside.length > 0 && <p className="text-muted-foreground text-xs">{aside.join(" · ")}</p>}
    </div>
  );
}
