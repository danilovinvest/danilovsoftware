"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { CustomerDetail } from "../lib/types";

type Resolved = {
  key: string;
  id: string;
  data: CustomerDetail | null;
  error: string | null;
};

/** Charge la fiche complète (contacts, projets, devis, échanges) en un appel. */
export function useCustomer(id: string) {
  const [reloadToken, setReloadToken] = useState(0);
  const key = `${id}#${reloadToken}`;

  const [resolved, setResolved] = useState<Resolved>({
    key: "",
    id: "",
    data: null,
    error: null,
  });

  // Dérivé plutôt que stocké : évite un setState synchrone dans l'effet.
  const loading = resolved.key !== key;

  useEffect(() => {
    const controller = new AbortController();

    api
      .getCustomer(id, controller.signal)
      .then((data) => setResolved({ key, id, data, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        /*
          Un rechargement raté garde la fiche qu'on regardait.

          Il remplaçait tout par l'erreur : une coupure réseau juste après un
          clic faisait disparaître la fiche au moment où l'on travaillait
          dessus. L'écran affiche désormais l'erreur en bandeau, au-dessus de ce
          qu'il montrait déjà. Une autre fiche, elle, repart de zéro.
        */
        setResolved((previous) => ({
          key,
          id,
          data: previous.id === id ? previous.data : null,
          error: errorMessage(cause),
        }));
      });

    return () => controller.abort();
  }, [id, key]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  /*
    Range tout de suite ce qu'une écriture vient de rendre.

    Chaque clic relisait toute la fiche avant que l'écran ne bouge. Une
    écriture qui rend l'objet à jour (un devis encaissé) le pose en place
    immédiatement ; le rechargement qui suit complète ce qu'elle a pu
    entraîner ailleurs — une tâche automatique, un statut client.
  */
  const mutate = useCallback((update: (current: CustomerDetail) => CustomerDetail) => {
    setResolved((previous) =>
      previous.data ? { ...previous, data: update(previous.data) } : previous,
    );
  }, []);

  return { customer: resolved.data, loading, error: resolved.error, reload, mutate };
}
