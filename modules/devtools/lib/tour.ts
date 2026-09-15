import { useSyncExternalStore } from "react";

/**
 * La visite en cours : quelle démo, quelle étape.
 *
 * Elle vit hors de React et dans `sessionStorage`, parce qu'une étape change
 * d'écran : le composant qui l'affiche est démonté et remonté par la
 * navigation, et une visite tenue dans son état repartirait de zéro à chaque
 * page. `sessionStorage` et non `localStorage` : une démo oubliée ouverte ne
 * doit pas reprendre le lendemain.
 */

export type Tour = { demoId: string; step: number };

const KEY = "crm:demo-tour";
const listeners = new Set<() => void>();
let current: Tour | null = load();

function load(): Tour | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Tour) : null;
  } catch {
    return null;
  }
}

function set(next: Tour | null) {
  current = next;
  try {
    if (next) window.sessionStorage.setItem(KEY, JSON.stringify(next));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Stockage refusé : la visite tient jusqu'au rechargement, c'est suffisant.
  }
  listeners.forEach((listener) => listener());
}

export function startTour(demoId: string) {
  set({ demoId, step: 0 });
}

export function goToStep(step: number) {
  if (current) set({ ...current, step });
}

export function stopTour() {
  set(null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTour(): Tour | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
