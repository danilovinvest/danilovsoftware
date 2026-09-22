"use client";

import { useMemo } from "react";
import { CheckIcon, LockIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermission } from "@/modules/auth";
import { Skeleton } from "@/shared/ui/feedback";
import { actionRank, resourceLabel, resourceRank } from "../lib/labels";
import type { PermissionEntry } from "../lib/types";

/**
 * La matrice des permissions, partagée par la création guidée et l'édition.
 *
 * Elle rend visible la règle que l'API applique de toute façon : **on ne peut
 * accorder que des permissions que l'on détient soi-même**. Celles qu'on n'a
 * pas apparaissent verrouillées plutôt que cachées — les masquer laisserait
 * croire qu'elles n'existent pas, et on chercherait pourquoi un rôle ne peut
 * pas faire ce qu'on attend de lui.
 *
 * Le catalogue vient du serveur : ajouter une permission à l'API la fait
 * apparaître ici sans toucher au front.
 */
export function PermissionMatrix({
  catalog,
  held,
  selected,
  loading,
  onToggle,
}: {
  catalog: PermissionEntry[];
  /** Permissions détenues par l'appelant : les autres sont verrouillées. */
  held: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  loading?: boolean;
  onToggle: (slug: string) => void;
}) {
  // L'identifiant technique (`customers:read`) ne parle qu'à qui administre
  // le système ; les autres lisent le libellé métier, et c'est lui qui décide.
  const showSlugs = usePermission("system:admin");
  const groups = useMemo(() => {
    const byResource = new Map<string, PermissionEntry[]>();
    for (const entry of catalog) {
      byResource.set(entry.resource, [...(byResource.get(entry.resource) ?? []), entry]);
    }
    return [...byResource.entries()]
      .map(
        ([resource, entries]) =>
          [
            resource,
            // L'API sert les actions par ordre alphabétique — « supprimer »
            // avant « consulter ». On rétablit l'ordre du cycle.
            [...entries].sort(
              (a, b) =>
                actionRank(a.action) - actionRank(b.action) ||
                a.slug.localeCompare(b.slug),
            ),
          ] as const,
      )
      .sort(([a], [b]) => resourceRank(a) - resourceRank(b) || a.localeCompare(b));
  }, [catalog]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([resource, entries]) => (
        <div key={resource} className="flex flex-col gap-1">
          <p className="text-muted-foreground px-1 text-[11px] font-medium tracking-wide uppercase">
            {resourceLabel(resource)}
          </p>
          <div className="overflow-hidden rounded-lg border">
            {entries.map((entry) => {
              const granted = selected.has(entry.slug);
              const locked = !held.has(entry.slug);

              return (
                <button
                  key={entry.slug}
                  type="button"
                  disabled={locked}
                  onClick={() => onToggle(entry.slug)}
                  title={
                    locked
                      ? "Vous ne détenez pas cette permission : vous ne pouvez pas l'accorder."
                      : undefined
                  }
                  className={cn(
                    "flex w-full items-start gap-2.5 border-b px-3 py-2 text-left transition-colors last:border-b-0",
                    locked ? "cursor-not-allowed opacity-50" : "hover:bg-accent/60",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                      granted ? "bg-brand border-transparent text-brand-ink" : "border-input",
                    )}
                  >
                    {granted && <CheckIcon className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs">{entry.description}</span>
                    {showSlugs && (
                      <span className="text-muted-foreground/70 block font-mono text-[11px]">
                        {entry.slug}
                      </span>
                    )}
                  </span>
                  {locked && (
                    <LockIcon className="text-muted-foreground mt-0.5 size-3 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Résumé d'une sélection : « Fiches client · Devis · 2 autres ». */
export function summarizeSelection(
  catalog: PermissionEntry[],
  selected: ReadonlySet<string>,
): string {
  const resources = new Set<string>();
  for (const entry of catalog) {
    if (selected.has(entry.slug)) resources.add(entry.resource);
  }
  if (resources.size === 0) return "aucune";
  return [...resources]
    .sort((a, b) => resourceRank(a) - resourceRank(b))
    .map(resourceLabel)
    .join(" · ");
}
