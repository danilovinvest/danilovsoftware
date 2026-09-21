"use client";

import { useSyncExternalStore } from "react";
import * as api from "../lib/api";
import type { CycleOrders, Parcours } from "../lib/cycle";

/*
  L'ordre des frises, lu une fois et partagé par tous les écrans qui en dessinent.

  La fiche, sa liste et son en-tête lisent la même frise : trois chargements
  auraient pu répondre à trois moments différents, et un cran se serait trouvé
  deuxième ici et cinquième là. Le magasin vit donc hors de React, comme les
  préférences d'affichage, et `useSyncExternalStore` le fait redescendre à tous
  les abonnés dès qu'un ordre est enregistré.

  Tant qu'il n'est pas arrivé — ou s'il échoue — la frise suit l'ordre par
  défaut. C'est ce qu'elle faisait avant, et une frise dans l'ordre du code vaut
  mieux qu'une frise absente.
*/

const EMPTY: CycleOrders = {};

let orders: CycleOrders = EMPTY;
let status: "idle" | "loading" | "ready" = "idle";
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function load() {
  if (status !== "idle") return;
  status = "loading";
  api
    .listCycleOrders()
    .then((rows) => {
      orders = Object.fromEntries(rows.map((row) => [row.parcours, row.steps]));
      status = "ready";
      emit();
    })
    // Un échec laisse l'ordre par défaut, et la prochaine frise réessaiera.
    .catch(() => {
      status = "idle";
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  load();
  return () => {
    listeners.delete(listener);
  };
}

export function useCycleOrders(): CycleOrders {
  return useSyncExternalStore(
    subscribe,
    () => orders,
    () => EMPTY,
  );
}

/** Reporte un ordre enregistré — `null` pour l'ordre par défaut — sur toutes les frises. */
export function publishCycleOrder(parcours: Parcours, steps: readonly string[] | null) {
  const next = { ...orders };
  if (steps === null) delete next[parcours];
  else next[parcours] = steps;
  orders = next;
  emit();
}
