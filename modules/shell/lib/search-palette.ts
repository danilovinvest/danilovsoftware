import { useSyncExternalStore } from "react";

/**
 * L'ouverture de la palette de recherche, partagée.
 *
 * Deux déclencheurs l'ouvrent — le champ de la barre latérale et celui de la
 * barre du haut, qui prend le relais là où la colonne n'est pas affichée — et
 * une seule palette existe. L'état vit donc hors des deux, comme les
 * préférences d'affichage : un état local à la palette obligerait chaque
 * déclencheur à la contenir.
 */
let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setSearchOpen(next: boolean | ((current: boolean) => boolean)) {
  const value = typeof next === "function" ? next(open) : next;
  if (value === open) return;
  open = value;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSearchOpen() {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}
