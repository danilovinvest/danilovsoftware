"use client";

import { LayersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENTITIES } from "../lib/entities";
import { ENTITY_ROLE } from "../lib/labels";

/**
 * Le sélecteur de société.
 *
 * C'est la pièce structurante de l'écran, pas un filtre parmi d'autres : une
 * facture appartient toujours à une personne morale, et cinq sociétés ne
 * partagent ni leur TVA, ni leurs échéances, ni leur comptabilité. Le rester
 * en tête de page évite la question « ces 180 000 €, c'est lesquels ? ».
 */
export function EntitySwitcher({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={cn(
          "flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-xs transition-colors",
          value === null
            ? "border-foreground/20 bg-selected text-foreground font-medium"
            : "text-muted-foreground hover:bg-accent border-transparent",
        )}
      >
        <LayersIcon className="size-3.5" />
        Groupe consolidé
      </button>

      {ENTITIES.map((entity) => {
        const role = ENTITY_ROLE[entity.role];
        const Icon = role.icon;
        const active = value === entity.id;
        return (
          <button
            key={entity.id}
            type="button"
            onClick={() => onChange(entity.id)}
            aria-pressed={active}
            title={`${entity.legal_form} · SIREN ${entity.siren} · ${entity.naf_label}`}
            className={cn(
              "flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-xs transition-colors",
              active
                ? "border-foreground/20 bg-selected text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent border-transparent",
            )}
          >
            <Icon className="size-3.5" />
            {entity.name}
          </button>
        );
      })}
    </div>
  );
}
