"use client";

import { LIVE, useCached } from "@/shared/api/cache";
import { getProjectBilling } from "../lib/syndic-api";
import { rulesEmpty } from "../lib/syndic-labels";
import type { BillingRules, ProjectBilling } from "../lib/syndic-types";

/**
 * « Pour facturer » : le circuit de facturation d'une affaire, en tête de ses
 * devis (migration 109).
 *
 * Trois étages, lus par le serveur dans l'ordre — la copropriété, le payeur de
 * l'affaire, son syndic courant —, le premier champ rempli gagnant champ par
 * champ. La ligne dit d'où vient chaque valeur : une adresse héritée du syndic
 * ne se corrige pas sur la fiche de l'immeuble.
 *
 * Rien ne s'affiche quand aucun étage ne dit rien, et la ligne n'est montée que
 * pour une affaire qu'un tiers suit : un particulier n'a pas de circuit.
 */
export function ProjectBillingLine({ projectId }: { projectId: string }) {
  const { data } = useCached(`customers:project-billing:${projectId}`, () => getProjectBilling(projectId), LIVE);
  if (!data || rulesEmpty(data.effective)) return null;
  const parts = describe(data);

  return (
    <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs" data-demo="project-billing">
      <span className="font-medium">Pour facturer</span>
      <ul className="mt-1 flex flex-col gap-0.5">
        {parts.map((part) => (
          <li key={part.key} className="flex flex-wrap gap-x-1.5">
            <span className="text-muted-foreground">{part.label}</span>
            {part.href ? (
              <a href={part.href} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                {part.value}
              </a>
            ) : (
              <span className="font-medium break-all">{part.value}</span>
            )}
            {part.from && <span className="text-muted-foreground">— {part.from}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Part = { key: keyof BillingRules; label: string; value: string; href?: string; from?: string };

const LABELS: Array<[keyof BillingRules, string]> = [
  ["billing_email", "Envoyer à"],
  ["supplier_reference", "Référence fournisseur"],
  ["portal_name", "Portail"],
  ["portal_reference", "Référence portail"],
  ["statement_label", "Libellé du relevé"],
  ["note", "À savoir"],
];

/** Les champs remplis, chacun avec la fiche qui le porte. */
function describe(billing: ProjectBilling): Part[] {
  const { effective, from } = billing;
  return LABELS.filter(([key]) => effective[key] !== "").map(([key, label]) => ({
    key,
    label,
    value: effective[key],
    // Le portail s'ouvre : le serveur n'en accepte qu'une adresse https.
    href:
      key === "portal_name" && effective.portal_url.startsWith("https://") ? effective.portal_url : undefined,
    from: from[key],
  }));
}
