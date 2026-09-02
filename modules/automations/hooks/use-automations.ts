"use client";

import { useCallback, useEffect, useState } from "react";
import { listCalendars, type Calendar } from "@/modules/calendar";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { Automation, Run } from "../lib/types";

type Resolved<T> = { key: string; data: T | null; error: string | null };

/*
 * Même forme que partout ailleurs : la réponse est rangée avec la question qui
 * l'a produite. « En cours » s'en déduit au lieu d'être stocké — aucun setState
 * synchrone dans un effet, et une réponse lente ne peut pas écraser la plus
 * récente.
 */

export function useAutomations() {
  const [token, setToken] = useState(0);
  const key = `automations:${token}`;
  const [resolved, setResolved] = useState<
    Resolved<{ items: Automation[]; whatsappReady: boolean }>
  >({ key: "", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    api
      .listAutomations(controller.signal)
      .then((data) =>
        setResolved({
          key,
          data: { items: data.items, whatsappReady: data.whatsapp_ready },
          error: null,
        }),
      )
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [key]);

  return {
    automations: resolved.data?.items ?? [],
    whatsappReady: resolved.data?.whatsappReady ?? false,
    loading: resolved.key !== key,
    error: resolved.error,
    reload: useCallback(() => setToken((value) => value + 1), []),
  };
}

/**
 * Une automatisation et ce dont son éditeur a besoin : les agendas, pour que la
 * carte « récapitulatif » propose des cases à cocher plutôt que des identifiants
 * à recopier.
 */
export function useAutomation(id: string) {
  const [token, setToken] = useState(0);
  const key = `automation:${id}:${token}`;
  const [resolved, setResolved] = useState<
    Resolved<{ automation: Automation; calendars: Calendar[] }>
  >({ key: "", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.getAutomation(id, controller.signal),
      listCalendars(controller.signal),
    ])
      .then(([automation, calendars]) =>
        setResolved({ key, data: { automation, calendars: calendars.items }, error: null }),
      )
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [key, id]);

  return {
    automation: resolved.data?.automation ?? null,
    calendars: resolved.data?.calendars ?? [],
    loading: resolved.key !== key,
    error: resolved.error,
    reload: useCallback(() => setToken((value) => value + 1), []),
  };
}

export function useRuns(automationId: string | null, limit = 30) {
  const [token, setToken] = useState(0);
  const key = `runs:${automationId ?? "tout"}:${token}`;
  const [resolved, setResolved] = useState<Resolved<Run[]>>({
    key: "",
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    api
      .listRuns(automationId, limit, controller.signal)
      .then((data) => setResolved({ key, data: data.items, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [key, automationId, limit]);

  return {
    runs: resolved.data ?? [],
    loading: resolved.key !== key,
    error: resolved.error,
    reload: useCallback(() => setToken((value) => value + 1), []),
  };
}
