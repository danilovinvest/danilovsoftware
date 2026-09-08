"use client";

import { BuildingIcon, HardHatIcon, LayersIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCOPES, setScope, useScope, type Scope } from "../lib/scope";

/**
 * Le sélecteur de périmètre, en tête de la barre latérale.
 *
 * Il est là et pas dans les réglages parce qu'on en change plusieurs fois par
 * jour : c'est la question « je travaille pour laquelle des deux ? », pas un
 * paramètre qu'on pose une fois.
 *
 * Un segmenté et non une liste déroulante : il n'y a que trois choix, et voir
 * lequel est actif importe plus que d'économiser trente pixels. Sur une barre
 * repliée en icônes, il ne reste que les icônes — l'infobulle porte le reste.
 */
const ICONES: Record<Scope, LucideIcon> = {
  tous: LayersIcon,
  "ompt-structure": BuildingIcon,
  "ompt-groupe": HardHatIcon,
};

export function ScopeSwitcher() {
  const scope = useScope();

  return (
    <div
      role="radiogroup"
      aria-label="Périmètre de travail"
      className="bg-muted flex gap-0.5 rounded-lg p-0.5 group-data-[collapsible=icon]:flex-col"
    >
      {SCOPES.map((entry) => {
        const Icon = ICONES[entry.id];
        const actif = scope === entry.id;
        return (
          <button
            key={entry.id}
            type="button"
            role="radio"
            aria-checked={actif}
            title={entry.hint}
            onClick={() => setScope(entry.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-[11px] transition-colors",
              actif
                ? "bg-background text-brand-text font-medium shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {/* Le libellé disparaît avec la barre repliée ; l'icône reste. */}
            <span className="truncate group-data-[collapsible=icon]:hidden">
              {entry.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
