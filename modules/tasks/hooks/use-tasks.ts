"use client";

import { useCallback, useEffect, useState } from "react";
import type { Paginated } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { Task, TaskFilters, TaskStats } from "../lib/types";

type Resolved = { key: string; data: Paginated<Task> | null; error: string | null };

export function useTasks(filters: TaskFilters) {
  const [reloadToken, setReloadToken] = useState(0);
  const key = `${JSON.stringify(filters)}#${reloadToken}`;

  const [resolved, setResolved] = useState<Resolved>({ key: "", data: null, error: null });
  // Dérivé plutôt que stocké : pas de setState synchrone dans l'effet.
  const loading = resolved.key !== key;

  useEffect(() => {
    const controller = new AbortController();
    api
      .listTasks(filters, controller.signal)
      .then((data) => setResolved({ key, data, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });
    return () => controller.abort();
    // `filters` est capturé par `key` : le comparer par identité relancerait
    // la requête à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);
  return { data: resolved.data, loading, error: resolved.error, reload };
}

export function useTaskStats(assigneeId: string | undefined, reloadToken: number) {
  const [stats, setStats] = useState<TaskStats | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .getStats(assigneeId, controller.signal)
      .then(setStats)
      .catch(() => setStats(null));
    return () => controller.abort();
  }, [assigneeId, reloadToken]);

  return stats;
}
