"use client";

import { useMemo, useState } from "react";
import { buildSnapshot } from "../lib/snapshot";
import type { Period } from "../lib/types";

/**
 * Source du tableau de bord.
 *
 * Elle a délibérément la forme d'un hook de chargement — `{ data, period,
 * setPeriod }` — alors qu'elle ne fait aucun appel réseau. Le jour où
 * `GET /v1/dashboard` existera, seul ce fichier changera : les onze panneaux
 * consomment déjà des types d'API, pas le jeu de démonstration.
 *
 * L'instant de référence est figé au montage. Sans cela, chaque rendu
 * recalculerait « il y a 3 jours » sur une horloge qui a bougé, et rien ne
 * serait mémorisable.
 */
export function useDashboard() {
  const [period, setPeriod] = useState<Period>("90j");
  const [at] = useState(() => new Date());

  const data = useMemo(() => buildSnapshot(period, at), [period, at]);

  return { data, period, setPeriod, at };
}
