"use client";

import { ErrorNotice } from "@/shared/ui/feedback";
import { CardsSkeleton } from "@/shared/ui/loading";
import { MetricCards } from "@/shared/ui/metric-cards";
import { plural } from "@/shared/lib/format";
import { useAwaitingQuotes, useSales } from "../hooks/use-live";
import { commercialMetrics } from "../lib/commercial";
import { PanelLink, SectionTitle } from "./parts";

/**
 * « Commercial » : signé, en attente, émis, taux de signature — lus de la base
 * (`GET /v1/sales` et la liste des devis sans réponse) et non plus de l'export
 * du 1er septembre. Un devis sans date d'émission n'entre dans aucun mois, et
 * la section le dit : la passe des PDF les date au fil des tours.
 */
export function CommercialSection() {
  const sales = useSales(true);
  const awaiting = useAwaitingQuotes(true);

  return (
    <section className="flex flex-col gap-3" data-demo="dashboard-commercial">
      <SectionTitle
        aside={<PanelLink href="/customers/devis-en-attente">Devis sans réponse</PanelLink>}
      >
        Commercial
      </SectionTitle>
      {sales.error && <ErrorNotice message={sales.error} onRetry={sales.reload} />}
      {sales.loading ? (
        <CardsSkeleton count={4} columns="sm:grid-cols-2 xl:grid-cols-4" hue="violet" />
      ) : sales.data ? (
        <>
          <MetricCards metrics={commercialMetrics(sales.data, awaiting.data)} />
          {sales.data.undated > 0 && (
            <p className="text-muted-foreground text-xs">
              {plural(sales.data.undated, "devis sans date d'émission", "devis sans date d'émission")}{" "}
              n&apos;entre{sales.data.undated > 1 ? "nt" : ""} dans aucun mois : la date se lit dans le
              PDF à chaque copie OneDrive, ou se saisit sur le devis.
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
