"use client";

import { EyeIcon, PencilIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type McpAccess = "lecture" | "ecriture";

const OPTIONS: Array<{
  value: McpAccess;
  label: string;
  hint: string;
  icon: typeof EyeIcon;
}> = [
  {
    value: "lecture",
    label: "Lecture seule",
    hint: "L'assistant lit et propose ; vous faites les modifications dans le CRM.",
    icon: EyeIcon,
  },
  {
    value: "ecriture",
    label: "Lecture et écriture",
    hint: "Il pourra créer des fiches, des tâches, des rendez-vous et faire avancer des affaires — dans la limite de vos permissions.",
    icon: PencilIcon,
  },
];

/**
 * Le consentement à l'écriture, **choisi avant** que l'adresse n'existe.
 *
 * C'était un interrupteur posé sous les boutons qui créent l'adresse, éteint
 * par défaut : on cliquait « Ajouter à ChatGPT » sans l'avoir vu, l'adresse
 * naissait en lecture seule, et comme le consentement est figé à la création,
 * il fallait révoquer puis recommencer (issue 98). Aucune option n'est cochée
 * d'office : les boutons attendent qu'on ait choisi, parce qu'un défaut qu'on
 * ne voit pas n'est pas un choix.
 */
export function McpAccessChoice({
  value,
  onChange,
}: {
  value: McpAccess | null;
  onChange: (value: McpAccess) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p id="mcp-access-label" className="text-xs font-medium">
        1. Ce que l&apos;assistant aura le droit de faire
      </p>
      <div
        role="radiogroup"
        aria-labelledby="mcp-access-label"
        className="grid gap-2 sm:grid-cols-2"
      >
        {OPTIONS.map((option) => {
          const checked = value === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex min-w-0 items-start gap-2 rounded-lg border p-2.5 text-left transition-colors",
                checked
                  ? option.value === "ecriture"
                    ? "border-warning bg-warning-soft/40"
                    : "border-foreground bg-muted/50"
                  : "hover:bg-muted/40",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-3.5 shrink-0",
                  checked && option.value === "ecriture" ? "text-warning" : "text-muted-foreground",
                )}
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium">{option.label}</span>
                <span className="text-muted-foreground block text-[11px] leading-relaxed">
                  {option.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-[11px]">
        Le choix est définitif pour cette adresse : pour changer, on en crée une autre et on
        révoque la première.
      </p>
    </div>
  );
}
