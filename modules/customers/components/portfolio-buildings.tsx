"use client";

import Link from "next/link";
import { formatAmount, formatDate, plural } from "@/shared/lib/format";
import { BUILDING_STATE, periodText } from "../lib/syndic-labels";
import type { PortfolioBuilding, PortfolioMoney } from "../lib/syndic-types";
import { EnumBadge } from "./enum-badge";

/**
 * Les immeubles d'un portefeuille, avec ce que chacun a rapporté et doit
 * encore — la question qu'on se pose d'un syndic avant de le rappeler.
 *
 * Trop large pour un téléphone : le tableau défile dans son cadre, jamais en
 * emportant la page. « Hérité » dit qu'un prédécesseur le gérait (le Cabinet
 * Cerutti pour CGI), « Ancien mandat » que le cabinet ne le gère plus : ses
 * affaires d'alors restent comptées ici, celles d'après ne le sont pas.
 */
export function PortfolioBuildings({
  buildings,
  direct,
  totals,
}: {
  buildings: PortfolioBuilding[];
  /** Les affaires que le cabinet porte lui-même, hors de tout immeuble. */
  direct: PortfolioMoney;
  totals: PortfolioMoney;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border" data-demo="portfolio-buildings">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="sr-only">Les immeubles du portefeuille et leurs montants</caption>
        <thead className="text-muted-foreground bg-muted/40 text-xs">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Immeuble</th>
            <th className="px-3 py-2 text-left font-medium">Suivi par</th>
            <th className="px-3 py-2 text-right font-medium" title="Ouvertes sur le total">Affaires</th>
            <th className="px-3 py-2 text-right font-medium">Facturé</th>
            <th className="px-3 py-2 text-right font-medium">Encaissé</th>
            <th className="px-3 py-2 text-right font-medium">Reste dû</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {buildings.map((building) => (
            <tr key={building.id} className="align-top">
              <td className="px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={`/customers/${building.id}`} className="font-medium hover:underline">
                    {building.name}
                  </Link>
                  {building.state !== "gere" && (
                    <EnumBadge value={building.state} entries={BUILDING_STATE} />
                  )}
                </div>
                <div className="text-muted-foreground text-xs">
                  {[
                    building.city,
                    building.via && `via ${building.via}`,
                    ...building.periods.map((period) => periodText(period, formatDate)),
                    building.statement_label && `relevé « ${building.statement_label} »`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </td>
              <td className="text-muted-foreground px-3 py-2 text-xs">
                {building.handlers.length > 0 ? building.handlers.join(", ") : "—"}
              </td>
              <MoneyCells money={building} />
            </tr>
          ))}
          {direct.projects > 0 && (
            <tr>
              <td className="text-muted-foreground px-3 py-2" colSpan={2}>
                Affaires du cabinet lui-même
              </td>
              <MoneyCells money={direct} />
            </tr>
          )}
        </tbody>
        <tfoot className="bg-muted/40 border-t font-semibold">
          <tr>
            <td className="px-3 py-2" colSpan={2}>
              Total — {plural(buildings.length, "immeuble")}
            </td>
            <MoneyCells money={totals} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Affaires ouvertes sur le total, puis les trois montants ; le reste dû en rouge. */
function MoneyCells({ money }: { money: PortfolioMoney }) {
  const owed = Number(money.remaining) > 0;
  return (
    <>
      <td className="px-3 py-2 text-right tabular-nums">
        {money.projects === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <>
            <span aria-hidden>
              {money.open_projects}
              <span className="text-muted-foreground"> / {money.projects}</span>
            </span>
            <span className="sr-only">
              {plural(money.open_projects, "affaire ouverte", "affaires ouvertes")} sur {money.projects}
            </span>
          </>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatAmount(money.invoiced)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatAmount(money.collected)}</td>
      <td className={owed ? "text-danger px-3 py-2 text-right tabular-nums" : "text-muted-foreground px-3 py-2 text-right tabular-nums"}>
        {formatAmount(money.remaining)}
      </td>
    </>
  );
}
