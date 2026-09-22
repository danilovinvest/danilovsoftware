"use client";

import { useCallback, useEffect, useState } from "react";
import type { Paginated } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { STATUS_ORDER } from "../lib/labels";
import * as api from "../lib/api";
import type { Task, TaskFilters, TaskStatus } from "../lib/types";

type Resolved = { key: string; data: Paginated<Task> | null; error: string | null };

/**
 * Les tâches qui répondent aux filtres, sur `pages` pages de `per_page`.
 *
 * Charger la suite relit **toutes** les pages déjà affichées plutôt que
 * d'ajouter la dernière au bout : un rechargement après un déplacement doit
 * garder les cartes de la page trois, et une tâche qui a changé de rang entre
 * deux lectures ne doit pas apparaître deux fois — d'où la fusion par
 * identifiant.
 */
export function useTasks(filters: TaskFilters, pages = 1) {
  const [reloadToken, setReloadToken] = useState(0);
  // Les filtres sont comparés par leur valeur, pas par leur identité : un
  // nouvel objet à chaque rendu relancerait la requête.
  const filtersJson = JSON.stringify(filters);
  const key = `${filtersJson}#${pages}#${reloadToken}`;

  const [resolved, setResolved] = useState<Resolved>({ key: "", data: null, error: null });
  // Dérivé plutôt que stocké : pas de setState synchrone dans l'effet.
  const loading = resolved.key !== key;

  useEffect(() => {
    const controller = new AbortController();
    const current = JSON.parse(filtersJson) as TaskFilters;
    const first = current.page ?? 1;
    Promise.all(
      Array.from({ length: Math.max(1, pages) }, (_, index) =>
        api.listTasks({ ...current, page: first + index }, controller.signal),
      ),
    )
      .then((results) => setResolved({ key, data: merge(results), error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [key, filtersJson, pages]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);
  return { data: resolved.data, loading, error: resolved.error, reload };
}

/** Plusieurs pages en une : le total est celui de la dernière lecture. */
function merge(results: Paginated<Task>[]): Paginated<Task> {
  const last = results[results.length - 1];
  const seen = new Set<string>();
  const items: Task[] = [];
  for (const result of results) {
    for (const task of result.items) {
      if (seen.has(task.id)) continue;
      seen.add(task.id);
      items.push(task);
    }
  }
  return { ...last, page: results[0].page, items };
}

/** Compteurs d'en-tête. `null` = inconnu, affiché « — » et jamais 0. */
export type TaskCounts = {
  byStatus: Record<TaskStatus, number | null>;
  overdue: number | null;
};

const UNKNOWN: TaskCounts = {
  byStatus: { a_faire: null, en_cours: null, en_attente: null, terminee: null },
  overdue: null,
};

/** Les compteurs d'une liste chargée en entier : exactement ses colonnes. */
export function countLoaded(items: Task[]): TaskCounts {
  const byStatus: Record<TaskStatus, number | null> = {
    a_faire: 0,
    en_cours: 0,
    en_attente: 0,
    terminee: 0,
  };
  let overdue = 0;
  for (const task of items) {
    byStatus[task.status] = (byStatus[task.status] ?? 0) + 1;
    if (task.is_overdue) overdue += 1;
  }
  return { byStatus, overdue };
}

type ResolvedCounts = { filtersJson: string; counts: TaskCounts };

/**
 * Les compteurs d'une liste **partielle**, demandés au serveur avec les mêmes
 * filtres que la liste. `/v1/tasks/stats` ne connaît que l'assigné : ses
 * chiffres ne correspondaient pas aux colonnes dès qu'un filtre était posé.
 * On lit donc le `total` de la liste elle-même, une ligne par statut.
 *
 * `enabled` est faux quand la liste est complète : ses compteurs se lisent
 * alors sur les cartes, sans aucune requête.
 *
 * Le retard ne se compte au serveur que si le filtre d'échéance le permet :
 * `due` n'accepte qu'une valeur, et « cette semaine » ∩ « en retard » ne se
 * demande pas. Il reste alors inconnu plutôt que faux.
 */
export function useServerCounts(filters: TaskFilters, enabled: boolean, reloadToken: number) {
  const filtersJson = JSON.stringify(filters);
  const key = `${filtersJson}#${reloadToken}`;
  const [resolved, setResolved] = useState<ResolvedCounts>({ filtersJson: "", counts: UNKNOWN });

  useEffect(() => {
    if (!enabled) return;
    const filters = JSON.parse(filtersJson) as TaskFilters;
    const controller = new AbortController();
    const base: TaskFilters = { ...filters, page: 1, per_page: 1 };
    const total = (patch: Partial<TaskFilters>) =>
      api.listTasks({ ...base, ...patch }, controller.signal).then((page) => page.total);

    const statusCounts = STATUS_ORDER.map((status) =>
      filters.status?.length && !filters.status.includes(status)
        ? Promise.resolve(0)
        : total({ status: [status] }),
    );
    const overdue =
      filters.due === undefined || filters.due === "overdue"
        ? total({ due: "overdue" })
        : filters.due === "none"
          ? Promise.resolve(0)
          : Promise.resolve(null);

    Promise.all([Promise.all(statusCounts), overdue])
      .then(([totals, late]) => {
        const byStatus = { ...UNKNOWN.byStatus };
        STATUS_ORDER.forEach((status, index) => {
          byStatus[status] = totals[index];
        });
        setResolved({ filtersJson, counts: { byStatus, overdue: late } });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResolved({ filtersJson, counts: UNKNOWN });
      });
    return () => controller.abort();
  }, [key, filtersJson, enabled]);

  // Un rechargement garde les chiffres précédents le temps de la réponse : les
  // remplacer par « — » à chaque carte déplacée ferait clignoter l'en-tête. Un
  // changement de filtre, lui, les efface — ils diraient autre chose.
  return resolved.filtersJson === filtersJson ? resolved.counts : UNKNOWN;
}
