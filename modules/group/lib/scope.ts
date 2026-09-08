"use client";

import { useSyncExternalStore } from "react";
import { ENTITY_BY_ID } from "./entities";

/**
 * Le périmètre de travail : sur quelle société on est.
 *
 * **Ce n'est pas une permission, c'est une lentille.** Un chargé d'affaires de
 * STRUCTURE et un de GROUPE ont le même rôle, pas le même périmètre. Et la
 * fiche client reste entière des deux côtés : cloisonner ferait perdre
 * l'historique travaux de son propre client au moment précis où il rappelle.
 * Ce que le périmètre change, c'est ce qu'on voit en premier — les listes, la
 * navigation, les compteurs.
 *
 * Il vit dans le navigateur, comme le thème, mais **pas dans les mêmes
 * préférences** : celles-là décrivent un écran, celui-ci décrit un travail. Le
 * jour où le rôle portera la société, cette valeur en héritera par défaut et ne
 * restera modifiable que pour ceux qui travaillent des deux côtés.
 *
 * `"tous"` est le groupe entier — la vue du dirigeant, et le défaut.
 */
export type Scope = "tous" | "ompt-structure" | "ompt-groupe";

/** Les seules sociétés qui émettent des devis aujourd'hui. */
export const SCOPES: Array<{ id: Scope; label: string; hint: string }> = [
  { id: "tous", label: "Tout le groupe", hint: "Les deux sociétés" },
  {
    id: "ompt-structure",
    label: "STRUCTURE",
    hint: "Le bureau d'études — études, sondages, plans d'exécution",
  },
  {
    id: "ompt-groupe",
    label: "GROUPE",
    hint: "Les travaux — gros œuvre, reprises en sous-œuvre, climatisation",
  },
];

const CLE = "danilov-crm.scope";

function valide(value: string | null): Scope {
  return value === "ompt-structure" || value === "ompt-groupe" ? value : "tous";
}

/*
 * Un « external store » au sens de React, comme les préférences d'affichage :
 * une valeur qui vit hors de l'arbre et que plusieurs écrans lisent.
 * `useSyncExternalStore` s'en charge sans effet de synchronisation, et sert un
 * instantané serveur distinct — ce qui évite l'écart d'hydratation qu'un
 * `useState(() => localStorage…)` provoquerait.
 */
let cache: Scope | null = null;
const listeners = new Set<() => void>();

function lire(): Scope {
  if (typeof window === "undefined") return "tous";
  if (cache === null) {
    try {
      cache = valide(window.localStorage.getItem(CLE));
    } catch {
      // Navigation privée, stockage refusé : le groupe entier fait un défaut
      // honnête, et l'écran fonctionne sans mémoire.
      cache = "tous";
    }
  }
  return cache;
}

function serveur(): Scope {
  return "tous";
}

function souscrire(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setScope(scope: Scope) {
  cache = scope;
  try {
    window.localStorage.setItem(CLE, scope);
  } catch {
    // Sans stockage, le choix vaut pour la session : mieux que rien.
  }
  for (const listener of listeners) listener();
}

export function useScope(): Scope {
  return useSyncExternalStore(souscrire, lire, serveur);
}

/**
 * Le paramètre à passer à l'API. Vide pour le groupe entier — le serveur ne
 * filtre alors rien, plutôt que de recevoir une valeur qu'il devrait ignorer.
 */
export function scopeParam(scope: Scope): string | undefined {
  return scope === "tous" ? undefined : scope;
}

/** Le nom complet de la société, pour un libellé ou une infobulle. */
export function scopeName(scope: Scope): string {
  return scope === "tous"
    ? "Tout le groupe"
    : (ENTITY_BY_ID.get(scope)?.name ?? scope);
}
