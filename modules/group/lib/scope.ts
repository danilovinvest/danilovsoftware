"use client";

import { useSyncExternalStore } from "react";
import { useAuth } from "@/modules/auth";
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

/** Le périmètre choisi dans ce navigateur, avant que le compte ait son mot à dire. */
function useStoredScope(): Scope {
  return useSyncExternalStore(souscrire, lire, serveur);
}

/**
 * La société du compte l'emporte sur la lentille du navigateur.
 *
 * Fonction pure, pour que la règle se lise et se teste sans React.
 *
 * Une société que cette liste ne connaît pas — les trois sociétés dormantes du
 * groupe — retombe sur le choix stocké. Ce n'est pas une faille : le serveur
 * filtre sur la **vraie** valeur du compte, jamais sur ce que le navigateur
 * demande, si bien que la seule conséquence possible est un libellé inexact,
 * jamais une donnée de trop.
 */
export function resolveScope(company: string, stored: Scope): Scope {
  if (company === "ompt-structure" || company === "ompt-groupe") return company;
  return stored;
}

/**
 * Le périmètre qui **s'applique**, et non celui qu'on a choisi.
 *
 * Un compte lié à une société lit la sienne, quoi qu'il ait coché ici : le
 * serveur impose déjà cette société, et afficher un autre périmètre ferait
 * mentir les compteurs sans rien montrer de plus.
 *
 * La résolution vit à cet endroit unique plutôt que dans les huit écrans qui
 * lisent le périmètre — la refaire huit fois la ferait diverger au premier
 * ajustement, et « où en est-on » ne voudrait plus dire la même chose d'un
 * écran à l'autre. C'est pourquoi ce module dépend désormais de `auth` :
 * l'inverse n'existe pas, il n'y a donc aucun cycle.
 */
export function useScope(): Scope {
  const stored = useStoredScope();
  const { account } = useAuth();
  return resolveScope(account?.issuer ?? "", stored);
}

/**
 * Vrai quand la société est imposée par le compte.
 *
 * Le sélecteur s'efface alors : offrir un choix que le serveur ignore est pire
 * que de ne pas l'offrir — on cliquerait, et rien ne changerait.
 */
export function useScopeLocked(): boolean {
  const { account } = useAuth();
  return (account?.issuer ?? "") !== "";
}

/**
 * Les sociétés qu'un compte peut attribuer, pour un `<select>`.
 *
 * Une seule liste, lue par le formulaire d'un compte et par l'assistant
 * d'invitation : deux copies divergeraient au premier ajustement, et l'une des
 * deux finirait par proposer une société que l'autre refuse.
 *
 * `""` vaut tout le groupe. Un appelant **lié** ne peut faire entrer personne
 * ailleurs que chez lui — c'est la règle du serveur — donc il ne voit que sa
 * société : proposer les autres serait promettre un refus.
 */
export function companyOptions(
  actorCompany: string,
): Array<{ value: string; label: string }> {
  if (actorCompany !== "") {
    return SCOPES.filter((entry) => entry.id === actorCompany).map((entry) => ({
      value: entry.id,
      label: entry.label,
    }));
  }
  return SCOPES.map((entry) => ({
    value: entry.id === "tous" ? "" : entry.id,
    label: entry.label,
  }));
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
