"use client";

import { usePermission } from "@/modules/auth";
import { LIVE, useCached } from "@/shared/api/cache";
import { ErrorNotice } from "@/shared/ui/feedback";
import { ListSkeleton } from "@/shared/ui/loading";
import { getBuilding } from "../lib/building-api";
import { orderInForce } from "../lib/building-labels";
import type { Building } from "../lib/building-types";
import type { CustomerDetail } from "../lib/types";
import { BuildingDocuments } from "./building-documents";
import { BuildingHistory } from "./building-history";
import { BuildingUnits } from "./building-units";

/**
 * L'onglet « Immeuble » d'une copropriété (feuille de route du 29/09,
 * phase 3).
 *
 * L'immeuble est le vrai client : il survit à ses syndics et à ses occupants.
 * L'onglet dit ce qui lui appartient en propre — les interventions qu'on y a
 * faites, toutes sociétés sur la même ligne de temps, qui y habite, et les
 * arrêtés ou rapports qui le concernent. Qui le gère se lit dans l'onglet
 * Fiche, sous « Gestion de l'immeuble ».
 *
 * Lu à l'ouverture de l'onglet seulement. Les affaires viennent de la fiche
 * déjà chargée ; les lots et le dossier ont leur lecture, que chaque écriture
 * remplace par sa réponse.
 */
export function BuildingPanel({ customer }: { customer: CustomerDetail }) {
  const canWrite = usePermission("customers:write");
  const { data, error, mutate } = useCached(
    // Le nombre d'affaires entre dans la clé : en créer, en déplacer ou en
    // fusionner change ce que les lots nomment et ce qui reste caché.
    `customers:building:${customer.id}:${customer.projects.length}`,
    () => getBuilding(customer.id),
    LIVE,
  );
  const adopt = (next: Building) => void mutate(next, { revalidate: false });
  const inForce = (data?.documents ?? []).filter(orderInForce);

  return (
    <div className="flex flex-col gap-6">
      {inForce.length > 0 && (
        <p className="bg-danger-soft text-danger rounded-lg px-3 py-2 text-sm font-medium" role="alert">
          {inForce.map((document) => document.title).join(" · ")} — en vigueur sur cet immeuble.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Interventions sur l&apos;immeuble</h2>
        <BuildingHistory
          customerId={customer.id}
          projects={customer.projects}
          quotes={customer.quotes}
          hidden={data?.hidden_projects ?? 0}
        />
      </section>

      {error ? <ErrorNotice message="Lots et dossier illisibles." onRetry={() => void mutate()} /> : null}
      {!data && !error && (
        <div className="overflow-hidden rounded-xl border">
          <ListSkeleton rows={3} hue="indigo" />
        </div>
      )}
      {data && (
        <>
          <BuildingUnits
            customerId={customer.id}
            units={data.units}
            projects={customer.projects}
            canWrite={canWrite}
            onChanged={adopt}
          />
          <BuildingDocuments
            customerId={customer.id}
            documents={data.documents}
            projects={customer.projects}
            canWrite={canWrite}
            onChanged={adopt}
          />
        </>
      )}
    </div>
  );
}
