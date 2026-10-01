"use client";

import { cn } from "@/lib/utils";
import { useSetPageTitle } from "@/modules/shell";
import { ErrorNotice } from "@/shared/ui/feedback";
import { CardsSkeleton } from "@/shared/ui/loading";
import { useBilling } from "../hooks/use-billing";
import { PERIODS } from "../lib/labels";
import { AgedPanel } from "./aged-panel";
import { FlowsPanel } from "./flows-panel";
import { RevenuePanel } from "./revenue-panel";
import { VatPanel } from "./vat-panel";
import { UnrecordedNotice } from "./unrecorded-notice";

/**
 * Flux de trésorerie — la lecture financière du groupe.
 *
 * Ces quatre panneaux vivaient dans l'onglet facturation, où ils répondaient à
 * une autre question que la sienne. La facturation regarde une société et son
 * journal des ventes ; la trésorerie regarde les cinq à la fois : ce qui est dû
 * et depuis quand, ce que la TVA va prélever, d'où vient le chiffre d'affaires,
 * et ce que le groupe se facture à lui-même.
 *
 * D'où l'absence de sélecteur de société ici, et sa présence là-bas : cette
 * page n'a de sens qu'au niveau du groupe, et un sélecteur qui ne piloterait
 * qu'un panneau sur quatre serait un piège.
 */
export function TreasuryView() {
  useSetPageTitle("Flux de trésorerie");

  const { data, error, loading, reload, period, setPeriod } = useBilling(null);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-base font-semibold">Flux de trésorerie</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Encours, TVA et répartition du chiffre d&apos;affaires, lus des factures
          de la base, sur les sociétés du périmètre.
        </p>
      </header>


      <div className="flex items-center justify-between gap-3">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Groupe consolidé
        </h2>
        {/* La période ne pilote que ce qui se mesure sur une durée — le chiffre
            d'affaires et les flux internes. L'encours et la TVA se lisent à
            l'instant t, leurs panneaux le disent. */}
        <div className="bg-muted flex rounded-md p-0.5">
          {PERIODS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => setPeriod(entry.value)}
              aria-pressed={period === entry.value}
              className={cn(
                "rounded-sm px-2.5 py-1 text-xs transition-colors",
                period === entry.value
                  ? "bg-background text-foreground font-medium shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <ErrorNotice message="Factures illisibles." onRetry={reload} /> : null}
      {loading || !data ? (
        error ? null : <CardsSkeleton count={4} columns="lg:grid-cols-2" hue="jade" />
      ) : (
        <>
      <UnrecordedNotice amount={data.unrecorded.amount} count={data.unrecorded.count} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <AgedPanel buckets={data.aged} />
        <VatPanel rows={data.vat} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <RevenuePanel
          rows={data.revenue}
          totalBilled={data.total_billed}
          consolidated={data.consolidated}
        />
        <FlowsPanel flows={data.flows} />
      </div>
        </>
      )}
    </div>
  );
}
