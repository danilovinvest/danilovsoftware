"use client";

import { FlaskConicalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermission } from "@/modules/auth";
import { euros } from "@/shared/lib/format";
import { MetricCards } from "@/shared/ui/metric-cards";
import { useBilling } from "../hooks/use-billing";
import { ENTITY_BY_ID } from "../lib/entities";
import { PERIODS, formatSiren } from "../lib/labels";
import { EntitySwitcher } from "./entity-switcher";
import { InvoiceTable } from "./invoice-table";
import { StructurePanel } from "./structure-panel";

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

  const { data, period, setPeriod, entityId, setEntityId } = useBilling(
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
            : `Les cinq sociétés du groupe · ${euros(data.consolidated)} facturés hors groupe sur la période`}
        </p>
      </header>

      <div className="border-warning/30 bg-warning-soft/50 text-warning flex items-start gap-2 rounded-xl border px-3 py-2 text-xs">
        <FlaskConicalIcon className="mt-0.5 size-3.5 shrink-0" />
        <p>
          <span className="font-medium">Factures de démonstration.</span> Les
          cinq identités juridiques — raisons sociales, SIREN, formes, codes NAF,
          dates d&apos;immatriculation — sont réelles et proviennent du registre
          national des entreprises. Tout ce qui est facturé ici est inventé, y
          compris les loyers et honoraires entre sociétés : la répartition du
          capital et les conventions internes ne sont pas publiques.
        </p>
      </div>

      {canSeeGroup && <EntitySwitcher value={entityId} onChange={setEntityId} />}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {entity ? entity.name : "Groupe consolidé"}
          </h2>
          <div className="bg-muted flex rounded-[4px] p-0.5">
            {PERIODS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => setPeriod(entry.value)}
                aria-pressed={period === entry.value}
                className={cn(
                  "rounded-[3px] px-2.5 py-1 text-xs transition-colors",
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
        <MetricCards metrics={data.metrics} />
      </section>

      <InvoiceTable invoices={data.invoices} showEntity={entityId === null} />

      {canSeeGroup && <StructurePanel />}
    </div>
  );
}
