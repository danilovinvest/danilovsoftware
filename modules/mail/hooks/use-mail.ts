"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { MailAccount, MailRun, UnknownSender } from "../lib/types";

type Resolved<T> = { key: string; data: T | null; error: string | null };

/** Pendant qu'une copie tourne on veut la voir avancer ; sinon, inutile de
 * harceler le serveur. Même rythme que le badge de l'agenda. */
const FAST_POLL = 4_000;
const SLOW_POLL = 30_000;

/**
 * L'état de la messagerie : comptes, journal, correspondants sans fiche.
 *
 * Les trois sont demandés ensemble parce qu'ils se lisent ensemble : un compte
 * sans son journal ne dit pas si la copie a tourné, et « qui écrit sans avoir
 * de fiche » n'a de sens qu'en regard du nombre de messages rapprochés.
 */
export function useMailbox() {
  const [token, setToken] = useState(0);
  // L'instant courant avance au même pas que le sondage : lu de l'horloge au
  // moment du rendu, « copié il y a 3 min » ne se rafraîchirait jamais, et le
  // rendu cesserait d'être une fonction de son état.
  const [now, setNow] = useState(() => Date.now());
  const key = `mail:${token}`;
  const [resolved, setResolved] = useState<
    Resolved<{ accounts: MailAccount[]; syncing: boolean; runs: MailRun[]; unknown: UnknownSender[] }>
  >({ key: "", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      api.listAccounts(controller.signal),
      api.listRuns(30, controller.signal),
      api.listUnknownSenders(2, 50, controller.signal),
    ])
      .then(([accounts, runs, unknown]) =>
        setResolved({
          key,
          data: {
            accounts: accounts.items, syncing: accounts.syncing,
            runs: runs.items, unknown: unknown.items,
          },
          error: null,
        }),
      )
      .catch((cause) => {
        if (controller.signal.aborted) return;
        // Un sondage raté garde ce qu'on savait déjà : effacer les boîtes sur
        // une coupure passagère remplaçait toute la messagerie par une erreur,
        // toutes les quatre secondes pendant une copie.
        setResolved((current) => ({ key, data: current.data, error: errorMessage(cause) }));
      });

    return () => controller.abort();
  }, [key]);

  const runs = resolved.data?.runs ?? [];
  const running = (resolved.data?.syncing ?? false) || runs.some((r) => r.finished_at === null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      setToken((v) => v + 1);
    }, running ? FAST_POLL : SLOW_POLL);
    return () => clearInterval(timer);
  }, [running]);

  const reload = useCallback(() => {
    setNow(Date.now());
    setToken((value) => value + 1);
  }, []);

  return {
    accounts: resolved.data?.accounts ?? [],
    runs,
    unknown: resolved.data?.unknown ?? [],
    running,
    now,
    last: runs.find((run) => run.finished_at !== null) ?? null,
    loading: resolved.key !== key && resolved.data === null,
    error: resolved.error,
    reload,
  };
}

/**
 * La dernière relecture de la boîte, et rien d'autre.
 *
 * `useMailbox` charge les comptes, le journal et les expéditeurs inconnus, et
 * sonde toutes les quatre secondes pendant une copie : c'est ce qu'il faut à
 * l'écran Messagerie, pas à une ligne « boîte relue il y a 2 min » au pied
 * d'une fiche. Un appel, une valeur.
 */
export function useLastMailRun() {
  const [last, setLast] = useState<MailRun | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    api
      .listRuns(5, controller.signal)
      .then((data) => setLast(data.items.find((run) => run.finished_at !== null) ?? null))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return last;
}

/** Le rythme auquel un écran ouvert regarde si la boîte a apporté du nouveau. */
const PULSE_POLL = 15_000;

/** Le dernier tour de copie qui a changé quelque chose, ou 0. */
function pulseOf(runs: MailRun[]): number {
  return runs.reduce(
    (latest, run) =>
      run.finished_at !== null && (run.fetched > 0 || run.linked > 0)
        ? Math.max(latest, run.id)
        : latest,
    0,
  );
}

/**
 * Un compteur qui avance quand la boîte a apporté du nouveau.
 *
 * Les écrans chargeaient leurs courriels une fois, à l'ouverture : la copie
 * pouvait bien amener un message en trois secondes, la liste l'ignorait jusqu'à
 * ce qu'on la rouvre. Plutôt que de recharger les listes à l'aveugle, on
 * regarde le journal — le fait que le serveur tient déjà — et le compteur
 * n'avance que lorsqu'un tour a réellement copié ou rattaché un message. Il
 * entre dans la clé des listes, et c'est la clé qui décide de la requête.
 *
 * La première lecture sert de repère et ne compte pas : sans cela, chaque
 * ouverture d'écran rechargerait sa liste une seconde fois.
 */
export function useMailPulse(enabled = true) {
  const [state, setState] = useState<{ last: number | null; bumps: number }>({
    last: null,
    bumps: 0,
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    function lire() {
      api
        .listRuns(6, controller.signal)
        .then((data) => {
          const latest = pulseOf(data.items);
          setState((current) =>
            current.last === null
              ? { last: latest, bumps: current.bumps }
              : latest > current.last
                ? { last: latest, bumps: current.bumps + 1 }
                : current,
          );
        })
        .catch(() => {});
    }
    lire();
    const timer = setInterval(lire, PULSE_POLL);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [enabled]);

  return state.bumps;
}
