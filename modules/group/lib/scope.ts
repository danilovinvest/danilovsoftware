"use client";

import { useSyncExternalStore } from "react";
import { useAuth } from "@/modules/auth";
import { ENTITY_BY_ID } from "./entities";

/**
 * Le périmètre de travail : sur quelle société on est.
 *
 * Il a été quatre choses successives, et l'ordre a son sens. D'abord une
 * **lentille** choisie dans le navigateur, que le serveur croyait sur parole —
 * retirer le paramètre de l'URL suffisait à voir l'autre société. Puis une
 * **appartenance** portée par le compte, imposée par le serveur. Puis, pour qui
 * voit tout le groupe, **l'hôte** — `groupe.…` ou `structure.…`. Enfin, dans
 * l'application de bureau, qui n'a plus d'hôte, **un choix** gardé sur le
 * poste : le sélecteur de l'en-tête (`workspace-switcher.tsx`).
 *
 * Ce choix ne vaut que pour un compte qui voit tout le groupe. Un compte lié à
 * une société la garde quoi qu'il choisisse — le serveur l'impose, et
 * l'en-tête ne lui propose rien.
 */
export type Scope = "tous" | "ompt-structure" | "ompt-groupe";

/**
 * Les sociétés du groupe qui ont un CRM.
 *
 * Elle ne sert plus à peindre un sélecteur mais à nommer une société et à
 * proposer les valeurs attribuables dans les réglages — deux emplois où la
 * liste doit rester unique.
 */
export const SCOPES: Array<{ id: Scope; label: string; hint: string }> = [
  { id: "tous", label: "Tout le groupe", hint: "Les deux sociétés" },
  {
    id: "ompt-structure",
    label: "STRUCTURE",
    hint: "Le bureau d\'études — études, sondages, plans d\'exécution",
  },
  {
    id: "ompt-groupe",
    label: "GROUPE",
    hint: "Les travaux — gros œuvre, reprises en sous-œuvre, climatisation",
  },
];

const STORAGE_KEY = "danilov-crm.workspace";

function isScope(value: unknown): value is Scope {
  return value === "tous" || value === "ompt-structure" || value === "ompt-groupe";
}

/*
 * Un « external store » au sens de React, comme les préférences d'affichage :
 * le choix vit dans `localStorage`, hors de l'arbre, et tous les écrans qui le
 * lisent doivent changer ensemble quand on le change. L'instantané serveur est
 * distinct — l'export statique se prépare sans `window`.
 */
const listeners = new Set<() => void>();
let cache: Scope | null | undefined;

function souscrire(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function lire(): Scope | null {
  if (cache !== undefined) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = isScope(raw) ? raw : null;
  } catch {
    // Stockage refusé : le groupe entier, sans mémoire d'une fois sur l'autre.
    cache = null;
  }
  return cache;
}

function serveur(): Scope | null {
  return null;
}

/** Retient la société choisie sur ce poste. */
export function chooseScope(scope: Scope): void {
  cache = scope;
  try {
    window.localStorage.setItem(STORAGE_KEY, scope);
  } catch {
    // Le choix vaut pour la session même si on ne peut pas l'écrire.
  }
  for (const listener of listeners) listener();
}

/**
 * La société du compte l'emporte, puis le choix du poste, puis tout le groupe.
 *
 * Fonction pure, pour que la règle se lise et se teste sans React.
 *
 * **L'ordre est celui de l'autorité, et il a été corrigé.** Une première
 * version mettait l'hôte devant : un compte lié à GROUPE qui ouvrait
 * `structure.` voyait les libellés de STRUCTURE pendant que le serveur lui
 * renvoyait, à juste titre, les données de GROUPE. Aucune fuite, puisque
 * `Identity.CompanyFilter` impose la société du compte ; mais un écran qui se
 * contredit fait douter du reste.
 *
 * Une société du compte est une **appartenance**, imposée par le serveur ; ce
 * que le poste retient n'est qu'un **choix**. Une appartenance prime sur un
 * choix, qui ne décide donc que pour qui ne porte aucune société — le dirigeant
 * et le trousseau de secours.
 *
 * Une société que cette liste ne connaît pas (les trois sociétés dormantes du
 * groupe) retombe sur le choix, puis sur tout le groupe : côté affichage
 * seulement, le serveur filtrant toujours sur la vraie valeur.
 */
export function resolveScope(chosen: Scope | null, company: string): Scope {
  if (company === "ompt-structure" || company === "ompt-groupe") return company;
  if (chosen) return chosen;
  return "tous";
}

/** Vrai quand le compte porte sa société : il n'a alors rien à choisir. */
export function scopeLocked(company: string): boolean {
  return company === "ompt-structure" || company === "ompt-groupe";
}

/**
 * Le périmètre qui **s'applique**.
 *
 * La résolution vit à cet endroit unique plutôt que dans les cinq écrans qui
 * lisent le périmètre : la refaire cinq fois la ferait diverger au premier
 * ajustement, et « où en est-on » ne voudrait plus dire la même chose d'un
 * écran à l'autre. C'est pourquoi ce module dépend de `auth` — l'inverse
 * n'existe pas, il n'y a donc aucun cycle.
 */
export function useScope(): Scope {
  const chosen = useSyncExternalStore(souscrire, lire, serveur);
  const { account } = useAuth();
  return resolveScope(chosen, account?.issuer ?? "");
}

/**
 * Les sociétés qu'un compte peut attribuer, pour un `<select>`.
 *
 * Une seule liste, lue par le formulaire d'un compte et par l'assistant
 * d'invitation : deux copies divergeraient au premier ajustement, et l'une des
 * deux finirait par proposer une société que l'autre refuse.
 *
 * Un appelant **lié** ne peut faire entrer personne ailleurs que chez lui —
 * c'est la règle du serveur — donc il ne voit que sa société : proposer les
 * autres serait promettre un refus.
 *
 * **« Tout le groupe » n'est pas dans cette liste**, et ce n'est pas un oubli.
 * Radix interdit la chaîne vide comme valeur d'option : `SelectField` la traduit
 * en sentinelle interne et n'affiche l'option « aucune valeur » que si on lui
 * passe un `emptyLabel`. C'est à l'appelant de le donner — et seulement s'il est
 * lui-même non lié, sans quoi il proposerait un périmètre que le serveur lui
 * refuserait.
 */
export function companyOptions(
  actorCompany: string,
): Array<{ value: string; label: string }> {
  /*
    « Tout le groupe » est une **option**, plus la valeur vide.

    Elle en était l'absence, et `SelectField` en faisait donc le défaut
    silencieux : on créait un accès aux deux sociétés en ne répondant pas. Le
    dirigeant l'a tranché le 17/09 — la société est obligatoire, et l'accès
    total se coche exprès. Sans `emptyLabel`, le champ n'a plus de valeur vide à
    offrir, et rien ne part tant que personne n'a choisi.

    Un compte lié, lui, ne voit que la sienne : on ne fait entrer quelqu'un que
    dans sa propre société (`ErrCompanyNotHeld`), et « tout le groupe » ne lui
    est pas plus attribuable que l'autre société.
  */
  if (actorCompany !== "") {
    return SCOPES.filter((entry) => entry.id === actorCompany).map((entry) => ({
      value: entry.id,
      label: entry.label,
    }));
  }
  return SCOPES.map((entry) => ({ value: entry.id, label: entry.label }));
}

/** Le libellé d'une société à partir d'une chaîne quelconque. */
export function companyLabel(value: string): string {
  // Vide et « tous » disent la même chose et doivent se lire pareil : le
  // serveur rend une société nulle pour tout le groupe, le formulaire envoie
  // désormais `tous` pour le dire explicitement.
  if (value === "" || value === "tous") return "Tout le groupe";
  return SCOPES.find((entry) => entry.id === value)?.label ?? value;
}

/**
 * Le paramètre à passer à l'API. Vide pour le groupe entier — le serveur ne
 * filtre alors rien, plutôt que de recevoir une valeur qu'il devrait ignorer.
 *
 * Le serveur impose de toute façon la société d'un compte lié : ce paramètre ne
 * vaut que pour un compte qui voit tout le groupe.
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
