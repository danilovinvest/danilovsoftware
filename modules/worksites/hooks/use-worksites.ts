"use client";

import { useMemo, useState } from "react";
import { buildWorksiteSnapshot } from "../lib/snapshot";
import type { Worksite } from "../lib/types";

export type WorksiteView = "tableau" | "planning" | "liste";

/**
 * État de l'écran chantiers.
 *
 * Le périmètre a deux niveaux — société, puis activité — parce que le groupe
 * en a deux : une raison sociale facture, un métier exécute. Choisir une
 * activité fixe la société ; choisir une société laisse voir tous ses métiers.
 *
 * L'instant de référence est figé au montage : sans cela, « 12 jours de
 * retard » se recalculerait à chaque rendu sur une horloge qui a bougé.
 */
export function useWorksites() {
  const [entityId, setEntityId] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [view, setView] = useState<WorksiteView>("tableau");
  const [selected, setSelected] = useState<Worksite | null>(null);
  const [at] = useState(() => new Date());

  const data = useMemo(
    () => buildWorksiteSnapshot(entityId, activityId, at),
    [entityId, activityId, at],
  );

  function scope(entity: string | null, activity: string | null) {
    setEntityId(entity);
    setActivityId(activity);
  }

  return {
    data,
    at,
    entityId,
    activityId,
    scope,
    view,
    setView,
    selected,
    select: setSelected,
    /** Retrouve un chantier depuis une ligne d'alerte, qui n'en porte que l'id. */
    open: (id: string) =>
      setSelected(data.worksites.find((worksite) => worksite.id === id) ?? null),
  };
}
