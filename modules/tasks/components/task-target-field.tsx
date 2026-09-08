"use client";

import { useEffect, useState } from "react";
import { BriefcaseIcon } from "lucide-react";
import {
  CustomerPicker,
  getCustomer,
  PROJECT_STAGE,
  type Project,
} from "@/modules/customers";
import { SelectField } from "@/shared/ui/form";
import { Spinner } from "@/shared/ui/feedback";

/**
 * À quoi une tâche se rattache : une fiche, ou l'une de ses affaires.
 *
 * Deux champs et non un seul, parce que ce sont deux précisions successives :
 * on sait toujours pour **qui** on travaille, pas toujours sur **quelle**
 * affaire. « Envoyer le RIB » vise un chantier précis ; « rappeler pour
 * l'assurance décennale » vise le client, quel que soit le chantier.
 *
 * La liste des affaires n'apparaît qu'une fois la fiche choisie, et seulement
 * si elle en a : proposer une liste vide ferait chercher ce qui n'existe pas.
 * Elle est chargée à ce moment-là et pas avant — trois cent soixante-six fiches
 * ne se préchargent pas pour un champ qu'on ne remplit pas toujours.
 */
export function TaskTargetField({
  customerId,
  customerName,
  projectId,
  onChange,
}: {
  customerId: string | null;
  customerName: string;
  projectId: string | null;
  onChange: (next: {
    customerId: string | null;
    customerName: string;
    projectId: string | null;
  }) => void;
}) {
  const [affaires, setAffaires] = useState<{
    pour: string;
    items: Project[];
  } | null>(null);

  useEffect(() => {
    if (!customerId) return;
    const controller = new AbortController();
    getCustomer(customerId, controller.signal)
      .then((fiche) => setAffaires({ pour: customerId, items: fiche.projects }))
      .catch(() => {
        if (!controller.signal.aborted) setAffaires({ pour: customerId, items: [] });
      });
    return () => controller.abort();
  }, [customerId]);

  const charge = affaires?.pour === customerId ? affaires.items : null;

  return (
    <div className="flex flex-col gap-3">
      <CustomerPicker
        label="Client ou prospect"
        value={customerId}
        valueName={customerName}
        hint="Facultatif. La tâche apparaîtra dans sa fiche."
        onChange={(id, name) =>
          // Changer de fiche remet l'affaire à zéro : une affaire d'un autre
          // client n'a aucun sens, et la garder créerait une cible incohérente
          // que rien à l'écran ne signalerait.
          onChange({ customerId: id, customerName: name, projectId: null })
        }
      />

      {customerId && charge === null && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
          <Spinner className="size-3" />
          Chargement des affaires…
        </p>
      )}

      {customerId && charge !== null && charge.length > 0 && (
        <SelectField
          label="Affaire"
          placeholder="Toute la fiche"
          emptyLabel="Toute la fiche"
          hint="Préciser une affaire range la tâche sur ce chantier ou cette étude."
          options={charge.map((project) => ({
            value: project.id,
            label: `${project.label} — ${PROJECT_STAGE[project.stage]?.label ?? project.stage}`,
          }))}
          value={projectId ?? ""}
          onValueChange={(value) =>
            onChange({ customerId, customerName, projectId: value || null })
          }
        />
      )}

      {customerId && charge !== null && charge.length === 0 && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
          <BriefcaseIcon className="size-3" />
          Cette fiche n&apos;a aucune affaire : la tâche vise la fiche entière.
        </p>
      )}
    </div>
  );
}
