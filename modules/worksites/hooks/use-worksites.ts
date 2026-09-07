"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import { alerts, buckets, read } from "../lib/derive";
import type { ReadWorksite, WorksiteResult } from "../lib/types";

export type WorksiteView = "tableau" | "planning" | "liste";

type Resolved = { key: string; data: WorksiteResult | null; error: string | null };

/**
 * L'état de l'écran chantiers.
 *
 * **L'instant vient du serveur.** `generated_at` accompagne la réponse, et
 * c'est lui qui sert de repère pour « démarré il y a 74 jours » : l'horloge
 * d'un poste ne décide pas de ce qui traîne, et deux navigateurs mal réglés
 * ne doivent pas afficher deux chantiers en retard différents.
 *
 * Le périmètre société / activité a disparu avec le jeu de démonstration :
 * rien, dans les données, ne rattache une affaire à un métier. Un filtre qui
 * ne filtre rien fait douter de ce qu'il montre.
 */
export function useWorksites() {
  const [city, setCity] = useState("");
  // Un repère de repli, figé au montage. Il ne sert qu'avant la première
  // réponse, sur une liste vide : le lire de l'horloge à chaque rendu ferait
  // du rendu autre chose qu'une fonction de son état.
  const [fallbackNow] = useState(() => Date.now());
  const [view, setView] = useState<WorksiteView>("tableau");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  const key = `worksites:${city}:${token}`;
  const [resolved, setResolved] = useState<Resolved>({
    key: "", data: null, error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    api
      .listWorksites(city, controller.signal)
      .then((data) => setResolved({ key, data, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [key, city]);

  const derived = useMemo(() => {
    // Pas encore de réponse : on dérive sur une liste vide plutôt que de rendre
    // une forme différente. Un écran qui change de forme entre le chargement et
    // les données oblige chaque composant à connaître les deux.
    const data = resolved.data;
    const now = data ? new Date(data.generated_at).getTime() : fallbackNow;
    const reads: ReadWorksite[] = (data?.items ?? []).map((item) => read(item, now));
    return { now, reads, board: buckets(reads), work: alerts(reads) };
  }, [resolved.data, fallbackNow]);

  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    ...derived,
    loading: resolved.key !== key,
    error: resolved.error,
    city,
    setCity,
    view,
    setView,
    reload,
    selected: derived.reads.find((r) => r.worksite.id === selectedId) ?? null,
    select: (id: string | null) => setSelectedId(id),
  };
}
