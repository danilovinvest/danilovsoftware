"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/**
 * Le poste a-t-il du réseau ?
 *
 * Le bandeau de connexion ne s'allumait que lorsque le renouvellement de session
 * échouait — une fois par quart d'heure. Entre-temps, un poste débranché
 * montrait des panneaux vides et des erreurs éparses sans jamais dire que
 * c'était le réseau. Le navigateur, lui, le sait tout de suite.
 *
 * Vrai côté serveur : un rendu serveur n'a pas d'avis sur le réseau du poste.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
