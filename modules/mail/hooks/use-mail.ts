"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { MailAccount, MailMessage, MailRun, UnknownSender } from "../lib/types";

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
        setResolved({ key, data: null, error: errorMessage(cause) });
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

/** Les courriels d'une fiche. Chargés à l'ouverture de l'onglet, pas avant :
 * la plupart des visites d'une fiche ne les regardent pas. */
export function useCustomerMail(customerId: string, enabled: boolean) {
  const key = enabled ? `customer-mail:${customerId}` : "";
  const [resolved, setResolved] = useState<Resolved<MailMessage[]>>({
    key: "", data: null, error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    api
      .listCustomerMail(customerId, controller.signal)
      .then((data) => setResolved({ key, data: data.items, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [key, customerId, enabled]);

  return {
    messages: resolved.data ?? [],
    loading: enabled && resolved.key !== key,
    error: resolved.error,
  };
}
