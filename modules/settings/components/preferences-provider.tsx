"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  applyPreferences,
  preferencesServerSnapshot,
  preferencesSnapshot,
  subscribePreferences,
  writePreferences,
  type Preferences,
} from "../lib/preferences";

/**
 * Lit les préférences d'affichage du poste.
 *
 * Aucun contexte React : la valeur vit dans le stockage local, pas dans
 * l'arbre. `useSyncExternalStore` la fait redescendre à tous les abonnés dès
 * qu'elle change, sans provider à traverser.
 */
export function usePreferences(): Preferences {
  return useSyncExternalStore(
    subscribePreferences,
    preferencesSnapshot,
    preferencesServerSnapshot,
  );
}

export { writePreferences as setPreferences };

/**
 * Répercute les préférences sur le document.
 *
 * Un seul montage suffit, tout en haut de l'application. Le composant ne rend
 * rien : il synchronise React avec le DOM, ce qui est précisément le rôle d'un
 * effet — et quand le choix est « système », il suit aussi les bascules de
 * l'OS en cours de session.
 */
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const preferences = usePreferences();

  useEffect(() => {
    applyPreferences(preferences);

    if (preferences.theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyPreferences(preferences);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preferences]);

  return children;
}
