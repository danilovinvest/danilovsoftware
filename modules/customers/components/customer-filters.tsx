"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { SelectField, TextField } from "@/shared/ui/field";
import { cn } from "@/shared/lib/cn";
import {
  CUSTOMER_SOURCE,
  CUSTOMER_STATUS,
  SORT_OPTIONS,
  toOptions,
} from "../lib/labels";
import { useDebounced } from "../hooks/use-customers";
import type { CustomerFilters, CustomerStatus } from "../lib/types";

const STATUS_TABS: Array<{ value: CustomerStatus | "all"; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "prospect", label: CUSTOMER_STATUS.prospect.label },
  { value: "client", label: CUSTOMER_STATUS.client.label },
  { value: "perdu", label: CUSTOMER_STATUS.perdu.label },
  { value: "archive", label: CUSTOMER_STATUS.archive.label },
];

export function CustomerFiltersBar({
  filters,
  onChange,
  onReset,
  hasActiveFilters,
  counts,
}: {
  filters: CustomerFilters;
  onChange: (patch: Partial<CustomerFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  counts: Record<string, number>;
}) {
  const [search, setSearch] = useState(filters.search ?? "");
  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    if ((filters.search ?? "") !== debouncedSearch) {
      onChange({ search: debouncedSearch || undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const activeStatus = filters.status?.length === 1 ? filters.status[0] : "all";

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap gap-1" aria-label="Filtrer par statut">
        {STATUS_TABS.map((tab) => {
          const selected = activeStatus === tab.value;
          const count = tab.value === "all" ? undefined : counts[tab.value];
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() =>
                onChange({ status: tab.value === "all" ? undefined : [tab.value] })
              }
              aria-pressed={selected}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                selected
                  ? "bg-accent-soft text-accent"
                  : "text-muted-foreground hover:bg-surface-muted",
              )}
            >
              {tab.label}
              {count !== undefined && (
                <span className="ml-1.5 opacity-60">{count}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="Recherche"
          placeholder="Nom, e-mail, téléphone, référence…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <TextField
          label="Ville"
          placeholder="Cannes, Nice…"
          value={filters.city ?? ""}
          onChange={(event) => onChange({ city: event.target.value || undefined })}
        />
        <SelectField
          label="Source"
          placeholder="Toutes"
          options={toOptions(CUSTOMER_SOURCE)}
          value={filters.source?.[0] ?? ""}
          onChange={(event) =>
            onChange({
              source: event.target.value
                ? [event.target.value as NonNullable<CustomerFilters["source"]>[number]]
                : undefined,
            })
          }
        />
        <SelectField
          label="Trier par"
          options={SORT_OPTIONS}
          value={filters.sort ?? "recent"}
          onChange={(event) =>
            onChange({ sort: event.target.value as CustomerFilters["sort"] })
          }
        />
      </div>

      {hasActiveFilters && (
        <div>
          <Button variant="ghost" size="sm" onClick={onReset}>
            Réinitialiser les filtres
          </Button>
        </div>
      )}
    </div>
  );
}
