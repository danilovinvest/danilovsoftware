"use client";

import { useEffect, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/shared/ui/form";
import { useScope } from "@/modules/group";
import { cn } from "@/lib/utils";
import {
  CUSTOMER_SOURCE,
  SORT_OPTIONS,
  toOptions,
} from "../lib/labels";
import { CYCLE_FILTERS } from "../lib/cycle";
import { REVIEW_FILTERS } from "../lib/review";
import { useDebounced } from "../hooks/use-customers";
import type {
  CustomerFilters,
  CustomerSource,
  CustomerStatus,
  FilterCounts,
} from "../lib/types";

/**
 * La barre de filtres de la liste des fiches.
 *
 * Elle empilait trois rangées sans hiérarchie : cinq onglets de statut, quatre
 * champs à largeur égale — dont la recherche, l'outil principal, réduite au
 * quart —, puis neuf pastilles réparties en deux groupes séparés d'un trait.
 * On ne savait plus par où commencer.
 *
 * Elle en garde trois, mais chacune répond à une question :
 *
 *   1. **Qui** — le statut, clients d'abord, avec ses comptes.
 *   2. **Lequel** — la recherche, large, et ses raffinements à droite.
 *   3. **Quoi faire** — les filtres de travail, chacun avec son compte.
 *
 * **Chaque filtre porte son nombre**, et c'est le principal changement : un
 * filtre sans compte ne dit pas s'il vaut le clic. « À relancer 63 » et
 * « Sans RDV 0 » ne s'ouvrent pas de la même façon — le second ne s'ouvre pas.
 * Un filtre à zéro reste visible mais éteint : le cacher ferait croire qu'il
 * n'existe pas.
 */

/** Clients d'abord : c'est eux qu'on ouvre, les prospects se cherchent. */
const STATUS_TABS: Array<{ value: CustomerStatus | "all"; label: string }> = [
  { value: "client", label: "Clients" },
  { value: "prospect", label: "Prospects" },
  { value: "perdu", label: "Perdus" },
  { value: "archive", label: "Archivées" },
  { value: "all", label: "Toutes" },
];

const SOCIETES = [
  { value: "ompt-groupe", label: "GROUPE" },
  { value: "ompt-structure", label: "STRUCTURE" },
];

export function CustomerFiltersBar({
  filters,
  onChange,
  onReset,
  hasActiveFilters,
  counts,
  filterCounts,
  total,
}: {
  filters: CustomerFilters;
  onChange: (patch: Partial<CustomerFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  counts: Record<string, number>;
  filterCounts: FilterCounts | null;
  total: number | null;
}) {
  const [search, setSearch] = useState(filters.search ?? "");
  const debouncedSearch = useDebounced(search);

  /*
    La ville se saisit comme la recherche : au clavier, donc avec le même
    délai. Elle partait à chaque frappe — une requête par lettre, et le curseur
    qui sautait sur les réponses lentes.
  */
  const [city, setCity] = useState(filters.city ?? "");
  const debouncedCity = useDebounced(city);

  useEffect(() => {
    if ((filters.search ?? "") !== debouncedSearch) {
      onChange({ search: debouncedSearch || undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    if ((filters.city ?? "") !== debouncedCity) {
      onChange({ city: debouncedCity || undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCity]);

  const activeStatus = filters.status?.length === 1 ? filters.status[0] : "all";
  /*
    Le filtre société n'existe que là où l'adresse n'en fixe aucune : sur
    groupe.… ou structure.…, ou pour un compte lié, le serveur impose la sienne
    et l'offrir serait promettre un choix qu'il ignore.
  */
  const choixSociete = useScope() === "tous";
  const cycle = filters.cycle ?? "tous";
  const review = filters.review ?? "";

  /* Les deux jeux de pastilles se lisent d'affilée : le cycle dit où en est
     l'affaire, la relecture ce qu'on sait de la fiche. Le trait qui les
     séparait laissait croire à deux barres d'outils. */
  const travail = [
    ...CYCLE_FILTERS.map((entry) => ({
      key: entry.key,
      label: entry.label,
      hint: "",
      actif: cycle === entry.key,
      compte: filterCounts?.[compteurDe(entry.key)] ?? null,
      choisir: () =>
        onChange({
          cycle: entry.key === "tous" ? undefined : entry.key,
          review: undefined,
          page: 1,
        }),
    })),
    ...REVIEW_FILTERS.map((entry) => ({
      key: entry.key,
      label: entry.label,
      hint: entry.hint,
      actif: review === entry.key,
      compte: filterCounts?.[compteurDe(entry.key)] ?? null,
      choisir: () =>
        onChange({
          review: review === entry.key ? undefined : entry.key,
          cycle: undefined,
          page: 1,
        }),
    })),
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* --- Qui ------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-1">
        <nav className="flex flex-wrap gap-1" aria-label="Filtrer par statut">
          {STATUS_TABS.map((tab) => {
            const selected = activeStatus === tab.value;
            const count = tab.value === "all" ? undefined : counts[tab.value];
            // Un statut qu'aucune fiche ne porte n'a pas d'onglet : « Perdus 0 »
            // occupait une place et ne menait nulle part.
            if (count === 0 && !selected) return null;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() =>
                  onChange({ status: tab.value === "all" ? undefined : [tab.value] })
                }
                aria-pressed={selected}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs transition-colors",
                  selected
                    ? "bg-selected text-brand-text font-medium"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {tab.label}
                {count !== undefined && (
                  <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {total !== null && (
          <span className="text-muted-foreground/60 ml-auto text-xs tabular-nums">
            {total} affichée{total > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* --- Lequel ----------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        {/* La recherche est l'outil principal : elle prend la place, les trois
            autres se contentent de ce qui reste. */}
        <div className="relative min-w-64 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            aria-label="Rechercher une fiche"
            placeholder="Nom, e-mail, téléphone, référence…"
            className="h-8 pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search !== "" && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        <Input
          aria-label="Filtrer par ville"
          placeholder="Ville…"
          className="h-8 w-32"
          value={city}
          onChange={(event) => setCity(event.target.value)}
        />
        {choixSociete && (
          <SelectField
            id="filtre-societe"
            options={SOCIETES}
            emptyLabel="Tout le groupe"
            placeholder="Société"
            wrapperClassName="w-40"
            value={filters.issuer ?? ""}
            onValueChange={(value) => onChange({ issuer: value || undefined })}
          />
        )}
        <SelectField
          options={toOptions(CUSTOMER_SOURCE)}
          emptyLabel="Toutes les sources"
          placeholder="Source"
          wrapperClassName="w-40"
          value={filters.source?.[0] ?? ""}
          onValueChange={(value) =>
            onChange({ source: value ? [value as CustomerSource] : undefined })
          }
        />
        <SelectField
          options={SORT_OPTIONS}
          placeholder="Trier par"
          wrapperClassName="w-36"
          value={filters.sort ?? "recent"}
          onValueChange={(value) => onChange({ sort: value as CustomerFilters["sort"] })}
        />

        {(hasActiveFilters || cycle !== "tous" || review !== "") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCity("");
              onReset();
            }}
            className="text-muted-foreground hover:text-foreground inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs"
          >
            <XIcon className="size-3.5" />
            Tout effacer
          </button>
        )}
      </div>

      {/* --- Quoi faire -------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-1">
        {travail.map((entry) => {
          const vide = entry.compte === 0 && !entry.actif;
          return (
            <button
              key={entry.key}
              type="button"
              title={entry.hint || undefined}
              disabled={vide}
              onClick={entry.choisir}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors",
                entry.actif
                  ? "bg-primary text-primary-foreground font-medium"
                  : vide
                    ? "text-muted-foreground/40 cursor-default"
                    : "text-muted-foreground hover:bg-muted",
              )}
            >
              {entry.label}
              {entry.compte !== null && entry.key !== "tous" && (
                <span className="tabular-nums opacity-60">{entry.compte}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Le compteur qui correspond à une pastille. Les clés sont celles de l'API. */
function compteurDe(key: string): keyof FilterCounts {
  switch (key) {
    case "a_relancer":
      return "a_relancer";
    case "sans_rdv":
      return "sans_rdv";
    case "devis_en_attente":
      return "devis_en_attente";
    case "acompte_en_attente":
      return "acompte_en_attente";
    case "sans_date":
      return "sans_date";
    case "a_verifier":
      return "a_verifier";
    case "a_completer":
      return "a_completer";
    default:
      return "toutes";
  }
}
