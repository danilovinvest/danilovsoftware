"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PlusIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { CUSTOMER_STATUS } from "../lib/labels";
import {
  useCustomerFilters,
  useCustomers,
  useCustomerStats,
} from "../hooks/use-customers";
import { CustomerFiltersBar } from "./customer-filters";
import { CustomerTable } from "./customer-table";
import { Pagination } from "./pagination";

const STATUS_ORDER = ["prospect", "client", "perdu", "archive"] as const;

/** Écran principal du module : compteurs, filtres, tableau et pagination. */
export function CustomersView() {
  const { filters, update, reset, active } = useCustomerFilters();
  const { data, loading, error, reload } = useCustomers(filters);
  const stats = useCustomerStats();
  const canCreate = usePermission("customers:write");

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const entry of stats?.by_status ?? []) result[entry.status] = entry.total;
    return result;
  }, [stats]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {/* Twenty tient ses titres de page bas : c'est le contenu qui porte
              la hiérarchie, pas la taille du titre. */}
          <h1 className="text-base font-semibold">Fiches client</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Prospects et clients, leurs projets, devis et échanges.
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/customers/nouveau">
              <PlusIcon />
              Nouvelle fiche
            </Link>
          </Button>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS_ORDER.map((status) => (
          <Card key={status} className="gap-0 py-3">
            <CardContent className="px-4">
              <p className="text-muted-foreground text-xs">
                {CUSTOMER_STATUS[status].label}
              </p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums">
                {counts[status] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="p-4">
          <CustomerFiltersBar
            filters={filters}
            onChange={update}
            onReset={reset}
            hasActiveFilters={active}
            counts={counts}
          />
        </div>

        {error ? (
          <div className="px-4 pb-4">
            <ErrorNotice message={error} />
          </div>
        ) : !loading && data?.items.length === 0 ? (
          <EmptyState
            title={active ? "Aucune fiche ne correspond" : "Aucune fiche pour le moment"}
            description={
              active
                ? "Élargissez la recherche ou réinitialisez les filtres."
                : "Créez la première fiche pour commencer à suivre vos prospects."
            }
            action={
              active ? (
                <Button variant="outline" size="sm" onClick={reset}>
                  Réinitialiser
                </Button>
              ) : canCreate ? (
                <Button asChild size="sm">
                  <Link href="/customers/nouveau">Créer une fiche</Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <CustomerTable
              items={data?.items ?? []}
              loading={loading}
              onChanged={reload}
            />
            <Pagination
              page={data?.page ?? 1}
              totalPages={data?.total_pages ?? 1}
              total={data?.total ?? 0}
              onChange={(page) => update({ page })}
            />
          </>
        )}
      </Card>
    </div>
  );
}
