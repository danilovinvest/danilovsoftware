"use client";

import { useMemo, useState } from "react";
import { buildBillingSnapshot } from "../lib/snapshot";
import type { Period } from "../lib/types";

/**
 * Source de l'écran de facturation.
 *
 * Même forme qu'un hook de chargement, sans appel réseau : le jour où
 * `GET /v1/billing` existera, seul ce fichier changera. L'instant de référence
 * est figé au montage — sinon « 47 jours de retard » se recalculerait à chaque
 * rendu sur une horloge qui a bougé.
 */
export function useBilling(initialEntity: string | null = null) {
  const [period, setPeriod] = useState<Period>("90j");
  /** null = vue consolidée du groupe. */
  const [entityId, setEntityId] = useState<string | null>(initialEntity);
  const [at] = useState(() => new Date());

  const data = useMemo(
    () => buildBillingSnapshot(period, entityId, at),
    [period, entityId, at],
  );

  return { data, period, setPeriod, entityId, setEntityId, at };
}
