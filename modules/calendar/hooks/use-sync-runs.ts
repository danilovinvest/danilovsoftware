"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { SyncRun } from "../lib/types";

/** Pendant qu'une copie tourne, on veut la voir avancer. Sinon, elle ne peut
 * rien faire de neuf avant cinq minutes : inutile de harceler le serveur. */
const FAST_POLL = 3_000;
const SLOW_POLL = 20_000;

type Resolved = { key: string; data: SyncRun[] | null; error: string | null };

/**
 * Le journal de synchronisation, rafraîchi tout seul.
 *
 * Le rythme suit ce qu'il y a à voir : trois secondes tant qu'une exécution
 * court, vingt sinon. Un intervalle unique obligerait à choisir entre un badge
 * qui traîne et un serveur sollicité pour rien.
 *
 * `now` avance au même pas et sert aux libellés « il y a 3 min ». Le lire de
 * l'horloge au moment du rendu donnerait un affichage qui ne se rafraîchit
 * jamais — et un rendu qui n'est pas une fonction de son état.
 */
export function useSyncRuns(limit = 40) {
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const key = `runs:${limit}:${tick}`;
  const [resolved, setResolved] = useState<Resolved>({
    key: "",
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    api
      .listSyncRuns(limit, controller.signal)
      .then((data) => setResolved({ key, data: data.items, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });

    return () => controller.abort();
  }, [key, limit]);

  const runs = useMemo(() => resolved.data ?? [], [resolved.data]);
  const running = runs.some((run) => run.finished_at === null);

  useEffect(() => {
    const timer = setInterval(
      () => {
        setNow(Date.now());
        setTick((value) => value + 1);
      },
      running ? FAST_POLL : SLOW_POLL,
    );
    return () => clearInterval(timer);
  }, [running]);

  const reload = useCallback(() => {
    setNow(Date.now());
    setTick((value) => value + 1);
  }, []);

  return {
    runs,
    running,
    /** La dernière exécution achevée : c'est elle qui porte le verdict. */
    last: runs.find((run) => run.finished_at !== null) ?? null,
    now,
    loading: resolved.key !== key && resolved.data === null,
    error: resolved.error,
    reload,
  };
}
