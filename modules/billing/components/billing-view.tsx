"use client";

import { cn } from "@/lib/utils";
import { usePermission } from "@/modules/auth";
import { plural } from "@/shared/lib/format";
import { MetricCards } from "@/shared/ui/metric-cards";
import { ErrorNotice } from "@/shared/ui/feedback";
import { TableSkeleton } from "@/shared/ui/loading";
import { useBilling } from "../hooks/use-billing";
import { ENTITY_BY_ID } from "@/modules/group";
import { PERIODS, formatSiren } from "../lib/labels";
import { EntitySwitcher } from "./entity-switcher";
import { InvoiceTable } from "./invoice-table";
import { StructurePanel } from "./structure-panel";
import { UnrecordedNotice } from "./unrecorded-notice";

/** La société d'exploitation dont le CRM suit les clients. */
const DEFAULT_ENTITY = "ompt-structure";

/**
 * Écran de facturation.
 *
 * Il est bâti autour d'un fait que le reste du CRM ignore : **le groupe compte
 * cinq personnes morales**. Une fiche client est suivie par le bureau
 * d'études, mais la facture peut être émise par la société de travaux, la
 * société civile encaisse un loyer et la holding refacture sa direction. Une
 * facturation qui additionnerait tout cela sans distinguer l'émetteur serait
 * fausse dès la première déclaration de TVA.
 *
 * D'où le sélecteur de société en tête. La lecture financière du groupe —
 * encours, TVA, répartition, refacturations internes — vit à côté, dans
 * « Flux de trésorerie » : ce sont deux questions différentes, et les mêler
 * obligeait à faire défiler un journal de factures pour atteindre un total.
 */
export function BillingView() {
  // La lecture du groupe entier — consolidation, flux internes, TVA, structure
  // — est réservée à la direction. `users:read` en tient lieu faute d'une
  // permission `invoices:read` côté API : à remplacer quand elle existera.
  // Comme RequireAuth, cette garde protège l'affichage, pas les données.
  const canSeeGroup = usePermission("users:read");

  const { data, error, loading, reload, period, setPeriod, entityId, setEntityId } = useBilling(
    canSeeGroup ? null : DEFAULT_ENTITY,
  );

  const entity = entityId === null ? null : (ENTITY_BY_ID.get(entityId) ?? null);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-base font-semibold">Facturation</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {entity
            ? `${entity.legal_form} · SIREN ${formatSiren(entity.siren)} · ${entity.naf_label}`
            : data
              ? `Le groupe · ${plural(data.invoices.length, "facture")} au journal`
              : "Le groupe"}
        </p>
      </header>


      {canSeeGroup && <EntitySwitcher value={entityId} onChange={setEntityId} />}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {entity ? entity.name : "Groupe consolidé"}
          </h2>
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
        {data && <MetricCards metrics={data.metrics} />}
      </section>

      {error ? <ErrorNotice message="Factures illisibles." onRetry={reload} /> : null}
      {loading || !data ? (
        error ? null : <TableSkeleton rows={6} columns={7} hue="jade" />
      ) : (
        <>
          <UnrecordedNotice amount={data.unrecorded.amount} count={data.unrecorded.count} />
          <InvoiceTable invoices={data.invoices} showEntity={entityId === null} />
        </>
      )}

      {canSeeGroup && <StructurePanel />}
    </div>
  );
}
