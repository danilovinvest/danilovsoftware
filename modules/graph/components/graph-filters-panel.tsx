"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { HUE } from "@/shared/ui/hue";
import { CATEGORY_META, CATEGORY_ORDER } from "../lib/categories";
import { countByCategory, countByFamily, type CompanyFilter, type GraphFilters } from "../lib/filters";
import { EDGE_FAMILY_META, EDGE_FAMILY_ORDER, type GraphModel } from "../lib/model";
import { searchNodes } from "../lib/stats";

const COMPANIES: Array<{ id: CompanyFilter; label: string }> = [
  { id: "tous", label: "Tout le groupe" },
  { id: "ompt-structure", label: "STRUCTURE" },
  { id: "ompt-groupe", label: "GROUPE" },
];

/**
 * La colonne de gauche : chercher, puis choisir ce qu'on regarde.
 *
 * Les catégories **sont** la légende : la pastille de chaque case est la
 * couleur de ses nœuds, et son compte dit combien il y en a. Deux listes à
 * tenir d'accord — une légende et des filtres — auraient divergé au premier
 * ajustement. La société ne s'offre qu'à un compte qui voit tout le groupe :
 * un compte lié ne lit déjà que la sienne, et proposer l'autre serait promettre
 * une toile vide.
 */
export function GraphFiltersPanel({
  model,
  filters,
  onChange,
  isolatedCount,
  showCompany,
  onPick,
}: {
  model: GraphModel;
  filters: GraphFilters;
  onChange: (filters: GraphFilters) => void;
  isolatedCount: number;
  showCompany: boolean;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchNodes(model.nodes, query), [model, query]);
  const categoryCounts = useMemo(() => countByCategory(model, filters), [model, filters]);
  const familyCounts = useMemo(() => countByFamily(model), [model]);

  return (
    <div className="flex flex-col gap-5 text-sm">
      <div className="relative" data-demo="graphe-recherche">
        <SearchIcon className="text-muted-foreground absolute top-2 left-2.5 size-4" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Chercher une fiche, un interlocuteur…"
          aria-label="Chercher dans le graphe"
          className="pl-8"
        />
        {results.length > 0 && (
          <ul className="bg-popover absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-md border p-1 shadow-md">
            {results.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(node.id);
                    setQuery("");
                  }}
                  className="hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs"
                >
                  <span className={cn("size-2 shrink-0 rounded-full", HUE[CATEGORY_META[node.category].hue].solid)} />
                  <span className="min-w-0 flex-1 truncate">{node.label}</span>
                  <span className="text-muted-foreground shrink-0">{node.fiche?.reference ?? "interlocuteur"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Section title="Catégories" demo="graphe-categories">
        {CATEGORY_ORDER.map((category) => (
          <CheckRow
            key={category}
            id={`graphe-cat-${category}`}
            checked={filters.categories[category]}
            onChange={(on) => onChange({ ...filters, categories: { ...filters.categories, [category]: on } })}
            dot={HUE[CATEGORY_META[category].hue].solid}
            label={CATEGORY_META[category].label}
            hint={CATEGORY_META[category].hint}
            count={categoryCounts[category]}
          />
        ))}
      </Section>

      <Section title="Liens" demo="graphe-liens">
        {EDGE_FAMILY_ORDER.map((family) => (
          <CheckRow
            key={family}
            id={`graphe-lien-${family}`}
            checked={filters.families[family]}
            onChange={(on) => onChange({ ...filters, families: { ...filters.families, [family]: on } })}
            line={EDGE_FAMILY_META[family].inferred ? "inferred" : "explicit"}
            label={EDGE_FAMILY_META[family].label}
            count={familyCounts[family]}
          />
        ))}
        <p className="text-muted-foreground text-[11px] leading-snug">
          Trait plein et flèche : posé à la main. Trait fin et pâle : déduit des interlocuteurs, jamais écrit en base.
        </p>
      </Section>

      <Section title="Affichage">
        <SwitchRow
          id="graphe-isoles"
          checked={filters.showIsolated}
          onChange={(on) => onChange({ ...filters, showIsolated: on })}
          label={`Afficher les fiches sans lien (${isolatedCount})`}
        />
        <SwitchRow
          id="graphe-archives"
          checked={filters.hideArchived}
          onChange={(on) => onChange({ ...filters, hideArchived: on })}
          label="Masquer les archivées"
        />
      </Section>

      {showCompany && (
        <Section title="Société">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Société">
            {COMPANIES.map((company) => (
              <button
                key={company.id}
                type="button"
                aria-pressed={filters.company === company.id}
                onClick={() => onChange({ ...filters, company: company.id })}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs",
                  filters.company === company.id ? "bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                {company.label}
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, demo, children }: { title: string; demo?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5" data-demo={demo}>
      <h2 className="text-h-indigo-11 text-[11px] font-semibold tracking-wider uppercase">{title}</h2>
      {children}
    </section>
  );
}

function CheckRow({
  id,
  checked,
  onChange,
  label,
  hint,
  count,
  dot,
  line,
}: {
  id: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
  hint?: string;
  count: number;
  dot?: string;
  line?: "explicit" | "inferred";
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-xs" title={hint}>
      <Checkbox id={id} checked={checked} onCheckedChange={(state) => onChange(state === true)} />
      {dot && <span className={cn("size-2.5 shrink-0 rounded-full", dot)} />}
      {line && (
        <span
          aria-hidden
          className={cn(
            "w-4 shrink-0 border-t",
            line === "explicit" ? "border-foreground/70 border-t-2" : "border-muted-foreground/50 border-dashed",
          )}
        />
      )}
      <span className={cn("min-w-0 flex-1 truncate", !checked && "text-muted-foreground")}>{label}</span>
      <span className="text-muted-foreground tabular-nums">{count}</span>
    </label>
  );
}

function SwitchRow({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-2 text-xs">
      <span>{label}</span>
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
