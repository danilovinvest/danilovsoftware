"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePermission } from "@/modules/auth";
import { Button, buttonClass } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { CUSTOMER_STATUS } from "../lib/labels";
import { useCustomerFilters, useCustomers, useCustomerStats } from "../hooks/use-customers";
import { CustomerFiltersBar } from "./customer-filters";
import { CustomerTable } from "./customer-table";
import { Pagination } from "./pagination";

/** Écran principal du module : compteurs, filtres, tableau et pagination. */
export function CustomersView() {
  const { filters, update, reset, active } = useCustomerFilters();
  const { data, loading, error } = useCustomers(filters);
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
          <h1 className="text-xl font-semibold text-foreground">Fiches client</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prospects et clients, leurs projets, devis et échanges.
          </p>
        </div>
        {canCreate && (
          <Link href="/customers/nouveau" className={buttonClass()}>
            Nouvelle fiche
          </Link>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["prospect", "client", "perdu", "archive"] as const).map((status) => (
          <Card key={status} className="px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {CUSTOMER_STATUS[status].label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {counts[status] ?? 0}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="px-5 py-4">
          <CustomerFiltersBar
            filters={filters}
            onChange={update}
            onReset={reset}
            hasActiveFilters={active}
            counts={counts}
          />
        </div>

        {error ? (
          <div className="px-5 pb-5">
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
                <Button variant="secondary" size="sm" onClick={reset}>
                  Réinitialiser
                </Button>
              ) : canCreate ? (
                <Link
                  href="/customers/nouveau"
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Créer une fiche
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            <CustomerTable items={data?.items ?? []} loading={loading} />
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
