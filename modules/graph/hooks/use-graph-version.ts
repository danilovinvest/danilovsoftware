"use client";

import { useEffect, useState } from "react";
import { getCustomersGraphVersion } from "../lib/api";

/** Le rythme par défaut : une requête de cinq agrégats, toutes les dix secondes. */
export const GRAPH_VERSION_POLL = 10_000;

/**
 * L'empreinte du graphe, relue à intervalle régulier.
 *
 * C'est ce qui rend le graphe vivant : une fiche créée ou corrigée, un
 * interlocuteur ajouté, un syndic posé changent l'empreinte, et l'écran qui
 * mettait cette valeur dans la clé de son chargement relit le graphe. On relit
 * l'empreinte et non le graphe — une requête de cinq agrégats contre cinq
 * lectures et quatre cents nœuds.
 *
 * **Rien ne part quand l'onglet est caché**, et la relecture reprend dès qu'il
 * revient au premier plan : un graphe laissé ouvert tout un week-end ne doit
 * pas interroger le serveur huit mille fois. Même esprit que `useMailPulse`,
 * qui lit un fait du serveur plutôt que de recharger à l'aveugle.
 *
 * Une lecture ratée garde la dernière empreinte connue : une coupure ne doit
 * pas faire recharger le graphe, seulement l'empêcher de se rafraîchir, ce que
 * `error` dit.
 */
export function useGraphVersion(pollMs: number = GRAPH_VERSION_POLL) {
  const [state, setState] = useState<{ version: string | null; error: boolean }>({
    version: null,
    error: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    function lire() {
      if (document.visibilityState === "hidden") return;
      getCustomersGraphVersion(controller.signal)
        .then((data) =>
          setState((current) =>
            current.version === data.version && !current.error
              ? current
              : { version: data.version, error: false },
          ),
        )
        .catch(() => {
          if (!controller.signal.aborted) {
            setState((current) => (current.error ? current : { ...current, error: true }));
          }
        });
    }
    lire();
    const timer = setInterval(lire, pollMs);
    document.addEventListener("visibilitychange", lire);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", lire);
      controller.abort();
    };
  }, [pollMs]);

  return state;
}
