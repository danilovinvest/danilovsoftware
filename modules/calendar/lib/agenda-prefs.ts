"use client";

import { useSyncExternalStore } from "react";
import type { CalendarView, EventKind } from "./types";

/**
 * Ce que l'agenda retient d'une visite à l'autre, sur ce poste.
 *
 * La vue, les agendas et catégories masqués, et « mes rendez-vous » se
 * perdaient à chaque ouverture : un chargé d'affaires refaisait les mêmes
 * trois clics chaque matin pour retrouver sa semaine. Ce sont des préférences
 * d'écran, pas de compte — elles vivent dans le navigateur, comme le thème.
 *
 * Lues par `useSyncExternalStore`, avec les défauts pour le rendu serveur : un
 * `useState(() => localStorage…)` donnerait deux rendus différents.
 */
export type AgendaPrefs = {
  /**
   * La vue choisie. Absente tant que personne n'a choisi : le défaut dépend
   * alors de la largeur de l'écran (voir `useCalendar`), et l'écrire ici le
   * figerait — un téléphone hériterait de la grille du mois d'un ordinateur.
   * Une valeur déjà enregistrée l'emporte toujours.
   */
  view?: CalendarView;
  hiddenCalendars: string[];
  hiddenKinds: EventKind[];
  /** Seulement les rendez-vous posés pour moi, ou par moi. */
  mine: boolean;
};

const KEY = "crm:agenda:prefs";
const DEFAULTS: AgendaPrefs = { hiddenCalendars: [], hiddenKinds: [], mine: false };

let cache: { raw: string | null; value: AgendaPrefs } | null = null;
const listeners = new Set<() => void>();

function read(): AgendaPrefs {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Stockage refusé : ce qui a été choisi pendant cette visite tient encore.
    return cache?.value ?? DEFAULTS;
  }
  // Même chaîne, même objet : `useSyncExternalStore` compare par identité.
  if (cache && cache.raw === raw) return cache.value;
  let value = DEFAULTS;
  try {
    value = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AgendaPrefs>) } : DEFAULTS;
  } catch {
    value = DEFAULTS;
  }
  cache = { raw, value };
  return value;
}

export function writeAgendaPrefs(patch: Partial<AgendaPrefs>): void {
  const next = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Stockage refusé : la préférence vaut pour cette visite seulement.
    cache = { raw: JSON.stringify(next), value: next };
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAgendaPrefs(): AgendaPrefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}
