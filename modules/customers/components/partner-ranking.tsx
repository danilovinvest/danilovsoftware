"use client";

import Link from "next/link";
import { scopeParam, useScope } from "@/modules/group";
import { LIVE, useCached } from "@/shared/api/cache";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { TableSkeleton } from "@/shared/ui/loading";
import { formatAmount, plural } from "@/shared/lib/format";
import { CUSTOMER_KIND } from "../lib/labels";
import { listPartnerRanking } from "../lib/partners";
import { appHref } from "@/shared/lib/routes";

/**
 * Le classement des partenaires : qui amène des affaires, combien se signent,
 * et ce qu'elles rapportent (feuille de route du 29/09, phase 5).
 *
 * Classés par le marché signé, puis par le nombre d'affaires. N'y figurent que
 * ceux qui ont apporté ou prescrit une affaire du périmètre : un projet commun
 * ne fait pas un apporteur. Le marché, le facturé et l'encaissé sont ceux des
 * affaires, tels que les autres écrans les lisent.
 */
export function PartnerRanking() {
  const issuer = scopeParam(useScope());
  const { data, error, isLoading, mutate } = useCached(
    `customers:partner-ranking:${issuer ?? ""}`,
    () => listPartnerRanking(issuer),
    LIVE,
  );
  const rows = data ?? [];
  const brought = rows.reduce((sum, row) => sum + row.totals.brought, 0);

  return (
    <div className="flex flex-col gap-4">
      <header data-demo="partner-ranking-head">
        <h1 className="text-base font-semibold">Partenaires</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {rows.length === 0
            ? "Qui apporte ou prescrit des affaires, et ce qu'elles deviennent."
            : `${plural(rows.length, "partenaire")} · ${plural(brought, "affaire apportée ou prescrite", "affaires apportées ou prescrites")}`}
        </p>
      </header>
      {error ? <ErrorNotice message="Classement illisible." onRetry={() => void mutate()} /> : null}
      {error && !data ? null : isLoading && !data ? (
        <TableSkeleton rows={4} columns={6} hue="indigo" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Aucun partenaire encore"
          description="Un partenaire entre ici quand une affaire le nomme apporteur, ou quand « Partenaires… » lui donne le rôle de prescripteur."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border" data-demo="partner-ranking">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">Le classement des partenaires</caption>
            <thead className="text-muted-foreground bg-muted/40 text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Partenaire</th>
                <th className="px-3 py-2 text-right font-medium">Affaires</th>
                <th className="px-3 py-2 text-right font-medium">Transformation</th>
                <th className="px-3 py-2 text-right font-medium">Marché signé</th>
                <th className="px-3 py-2 text-right font-medium">Facturé</th>
                <th className="px-3 py-2 text-right font-medium">Encaissé</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, index) => (
                <tr key={row.partner_id} className="align-top">
                  <td className="px-3 py-2">
                    <span className="text-muted-foreground mr-2 tabular-nums">{index + 1}.</span>
                    <Link href={appHref(`/customers/${row.partner_id}?vue=partenaire`)} className="font-medium hover:underline">
                      {row.partner_name}
                    </Link>
                    <div className="text-muted-foreground text-xs">
                      {[
                        CUSTOMER_KIND[row.partner_kind]?.label,
                        Number(row.totals.direct_fees) > 0 &&
                          `${formatAmount(row.totals.direct_fees)} réglés en direct, hors OMPT`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.totals.brought}
                    <div className="text-muted-foreground text-xs">
                      {plural(row.totals.signed, "signée")} · {row.totals.open} en cours
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.totals.conversion_rate === null ? "—" : `${row.totals.conversion_rate} %`}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{formatAmount(row.totals.market)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatAmount(row.totals.invoiced)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatAmount(row.totals.collected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
