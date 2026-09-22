"use client";

import { useCallback } from "react";
import { LIVE, useCached } from "@/shared/api/cache";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { CustomerDetail } from "../lib/types";

/**
 * Charge la fiche complète (contacts, projets, devis, échanges) en un appel.
 *
 * **Elle vit dans le cache partagé** : revenir sur une fiche déjà ouverte la
 * montre tout de suite, sans squelette, puis la revérifie en arrière-plan. Une
 * autre fiche, elle, repart de zéro — chaque identifiant a sa propre entrée.
 */
export function useCustomer(id: string) {
  const {
    data,
    error,
    isValidating,
    mutate: swrMutate,
  } = useCached(`customers:detail:${id}`, () => api.getCustomer(id), LIVE);

  /*
    Un rechargement raté garde la fiche qu'on regardait : le cache conserve
    la dernière réponse à côté de l'erreur, et l'écran affiche celle-ci en
    bandeau au-dessus de ce qu'il montrait déjà.
  */
  const reload = useCallback(() => void swrMutate(), [swrMutate]);

  /*
    Range tout de suite ce qu'une écriture vient de rendre.

    Chaque clic relisait toute la fiche avant que l'écran ne bouge. Une
    écriture qui rend l'objet à jour (un devis encaissé) le pose en place
    immédiatement — dans le cache, donc aussi pour la prochaine visite ; le
    rechargement qui suit complète ce qu'elle a pu entraîner ailleurs — une
    tâche automatique, un statut client.
  */
  const mutate = useCallback(
    (update: (current: CustomerDetail) => CustomerDetail) => {
      void swrMutate((current) => (current ? update(current) : current), { revalidate: false });
    },
    [swrMutate],
  );

  return {
    customer: data ?? null,
    loading: isValidating,
    error: error ? errorMessage(error) : null,
    reload,
    mutate,
  };
}
