"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { CUSTOMER_STATUS } from "../lib/labels";
import {
  CYCLE_FILTERS,
  matchesFilter,
  nextAction,
  readCycle,
  type CycleFilter,
} from "../lib/cycle";
import { readJalons } from "../lib/jalons";
import {
  useCustomerFilters,
  useCustomers,
  useCustomerStats,
} from "../hooks/use-customers";
import { CustomerFiltersBar } from "./customer-filters";
import { CustomerTable } from "./customer-table";
import { Pagination } from "./pagination";
import { cn } from "@/lib/utils";
import type { CustomerListItem } from "../lib/types";

const STATUS_ORDER = ["prospect", "client", "perdu", "archive"] as const;

/** Écran principal du module : compteurs, filtres, tableau et pagination. */
export function CustomersView() {
  const { filters, update, reset, active } = useCustomerFilters();
  const { data, loading, error } = useCustomers(filters);
  const stats = useCustomerStats();
  const canCreate = usePermission("customers:write");

  /**
   * Les filtres de cycle s'appliquent à la page affichée, pas à la base.
   *
   * Le serveur sait filtrer par statut, pas par « acompte en attente » : la
   * notion n'existe que dans la lecture du cycle, côté client. Filtrer ici est
   * donc le seul endroit possible aujourd'hui, et l'écran dit sur quoi il
   * porte plutôt que de laisser croire à une recherche globale.
   */
  const [cycle, setCycle] = useState<CycleFilter>("tous");
  const [now] = useState(() => Date.now());

  const visible = useMemo(
    () => (data?.items ?? []).filter((item) => matchesCycle(item, cycle, now)),
    [data, cycle, now],
  );

  const cycleCounts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const entry of CYCLE_FILTERS) {
      result[entry.key] = (data?.items ?? []).filter((item) =>
        matchesCycle(item, entry.key, now),
      ).length;
    }
    return result;
  }, [data, now]);

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

      {/*
        `min-w-0` n'est pas décoratif : un enfant de conteneur flex a par défaut
        `min-width: auto`, donc il s'élargit pour contenir le tableau au lieu de
        le laisser défiler. Sans cette classe, c'est la page entière qui prend
        cent trente pixels de trop et défile latéralement.
      */}
      <Card className="min-w-0 gap-0 overflow-hidden py-0">
        <div className="p-4">
          <CustomerFiltersBar
            filters={filters}
            onChange={update}
            onReset={reset}
            hasActiveFilters={active}
            counts={counts}
          />

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {CYCLE_FILTERS.map((entry) => {
              const count = cycleCounts[entry.key] ?? 0;
              const disabled = entry.key !== "tous" && count === 0;
              return (
                <button
                  key={entry.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => setCycle(entry.key)}
                  className={cn(
                    "rounded-[4px] px-2 py-1 text-xs transition-colors",
                    cycle === entry.key
                      ? "bg-primary text-primary-foreground font-medium"
                      : disabled
                        ? "text-muted-foreground/40"
                        : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {entry.label}
                  {entry.key !== "tous" && <span className="ml-1.5 tabular-nums">{count}</span>}
                </button>
              );
            })}
            {cycle !== "tous" && (
              <span className="text-muted-foreground/60 ml-1 text-xs">
                sur cette page seulement
              </span>
            )}
          </div>
        </div>

        {error ? (
          <div className="px-4 pb-4">
            <ErrorNotice message={error} />
          </div>
        ) : !loading && visible.length === 0 ? (
          <EmptyState
            title={
              active || cycle !== "tous"
                ? "Aucune fiche ne correspond"
                : "Aucune fiche pour le moment"
            }
            description={
              cycle !== "tous"
                ? "Aucune affaire de cette page n'en est là. Essayez une autre page ou un autre filtre."
                : active
                ? "Élargissez la recherche ou réinitialisez les filtres."
                : "Créez la première fiche pour commencer à suivre vos prospects."
            }
            action={
              cycle !== "tous" ? (
                <Button variant="outline" size="sm" onClick={() => setCycle("tous")}>
                  Toutes les fiches
                </Button>
              ) : active ? (
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
            <CustomerTable items={visible} loading={loading} />
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

/**
 * Une fiche correspond si l'une de ses affaires correspond. Exiger que toutes
 * le fassent viderait la liste dès qu'un client a deux chantiers à des stades
 * différents, ce qui est le cas courant.
 */
function matchesCycle(customer: CustomerListItem, filter: CycleFilter, now: number): boolean {
  if (filter === "tous") return true;
  return customer.projects.some((project) => {
    const jalons = readJalons(project.id, [], undefined, now);
    const points = readCycle(project, [], [], jalons, now);
    return matchesFilter(nextAction(points, project, [], jalons, now), filter);
  });
}
