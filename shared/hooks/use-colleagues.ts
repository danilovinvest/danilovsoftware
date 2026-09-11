"use client";

import { useEffect, useState } from "react";
import { listColleagues, type Colleague } from "../api/directory";

/**
 * L'annuaire, chargé une fois par écran qui en a besoin.
 *
 * Une liste vide en cas d'échec, et non une erreur remontée : ne pas pouvoir
 * proposer de collègue n'empêche pas d'enregistrer ce qu'on était en train
 * d'écrire.
 */
export function useColleagues(): Colleague[] {
  const [colleagues, setColleagues] = useState<Colleague[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    listColleagues(controller.signal)
      .then((data) => setColleagues(data.items))
      .catch(() => setColleagues([]));
    return () => controller.abort();
  }, []);

  return colleagues;
}
