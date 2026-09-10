"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { ImportRun } from "../lib/types";

/** Même rythme que le journal du miroir : trois secondes tant qu'un import
 * court, vingt sinon. Rien de neuf ne peut arriver plus vite que le tour de
 * cinq minutes du serveur. */
const FAST_POLL = 3_000;
const SLOW_POLL = 20_000;

type Resolved = { key: string; data: ImportRun[] | null; error: string | null };

/**
 * Le journal des imports, rafraîchi tout seul.
 *
 * C'est le pendant de `useSyncRuns`, et il existe séparément parce que les deux
 * étages répondent à deux questions distinctes : le miroir dit ce que **Google**
 * a rendu, l'import ce que la **grille** affiche. Les fondre ferait dire « à
 * jour » à un écran de trois jours de retard — ce qui est exactement arrivé.
 *
 * `now` avance au même pas et sert aux libellés « il y a 3 min ». Le lire de
 * l'horloge au moment du rendu donnerait un affichage qui ne se rafraîchit
 * jamais.
 */
export function useImportRuns(limit = 20) {
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const key = `imports:${limit}:${tick}`;
  const [resolved, setResolved] = useState<Resolved>({
    key: "",
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    api
      .listImportRuns(limit, controller.signal)
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
    error: resolved.error,
    reload,
  };
}
