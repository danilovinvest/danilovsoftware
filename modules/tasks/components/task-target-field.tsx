"use client";

import { CustomerPicker, ProjectPicker } from "@/modules/customers";

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

      <ProjectPicker
        customerId={customerId}
        value={projectId}
        hint="Préciser une affaire range la tâche sur ce chantier ou cette étude."
        onChange={(next) => onChange({ customerId, customerName, projectId: next })}
      />

    </div>
  );
}
