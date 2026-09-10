"use client";

import { useEffect, useState } from "react";
import { BriefcaseIcon } from "lucide-react";
import { SelectField } from "@/shared/ui/form";
import { Spinner } from "@/shared/ui/feedback";
import { getCustomer } from "../lib/api";
import { PROJECT_STAGE } from "../lib/labels";
import type { Project } from "../lib/types";

/**
 * Choisir l'une des affaires d'une fiche.
 *
 * Le second des deux champs qui rattachent quelque chose à un client, et il
 * vit ici parce que c'est `customers` qui sait ce qu'est une affaire. Deux
 * écrans le posent — la tâche et l'événement d'agenda — et il y répond à la
 * même question : on sait toujours pour **qui** on travaille, pas toujours sur
 * **quelle** affaire. « Rappeler pour l'assurance » vise le client quel que
 * soit le chantier ; « PV signé » vise un chantier précis.
 *
 * La liste est chargée **au moment du choix**, pas avant : trois cent soixante
 * fiches ne se préchargent pas pour un champ qu'on ne remplit pas toujours.
 * Elle garde la question avec sa réponse (`pour`), pour ne jamais afficher les
 * affaires du client précédent sous le nom du suivant.
 *
 * Le composant se **taît** quand il n'a rien à proposer : pas de fiche, ou une
 * fiche sans affaire. Une liste déroulante vide ferait chercher ce qui n'existe
 * pas.
 */
export function ProjectPicker({
  customerId,
  value,
  onChange,
  hint,
  emptyLabel = "Toute la fiche",
}: {
  customerId: string | null;
  value: string | null;
  onChange: (projectId: string | null) => void;
  hint?: string;
  emptyLabel?: string;
}) {
  const [affaires, setAffaires] = useState<{ pour: string; items: Project[] } | null>(
    null,
  );

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

  if (!customerId) return null;

  const charge = affaires?.pour === customerId ? affaires.items : null;

  if (charge === null) {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
        <Spinner className="size-3" />
        Chargement des affaires…
      </p>
    );
  }

  if (charge.length === 0) {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
        <BriefcaseIcon className="size-3" />
        Cette fiche n&apos;a aucune affaire.
      </p>
    );
  }

  return (
    <SelectField
      label="Affaire"
      placeholder={emptyLabel}
      emptyLabel={emptyLabel}
      hint={hint}
      options={charge.map((project) => ({
        value: project.id,
        label: `${project.label} — ${PROJECT_STAGE[project.stage]?.label ?? project.stage}`,
      }))}
      value={value ?? ""}
      onValueChange={(next) => onChange(next || null)}
    />
  );
}
