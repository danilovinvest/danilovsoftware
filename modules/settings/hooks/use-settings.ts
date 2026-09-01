"use client";

import { useEffect, useState } from "react";
import type { Paginated } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { Role, WorkspaceUser } from "../lib/types";

type Resolved<T> = { key: string; data: T | null; error: string | null };

/*
 * Même forme que `useCustomers` : la réponse est rangée avec la question qui
 * l'a produite. « En cours » s'en déduit au lieu d'être stocké — aucun
 * setState synchrone dans un effet, et une réponse lente ne peut pas écraser
 * la plus récente.
 */

/**
 * Les membres d'un bureau d'études tiennent largement en une page : on charge
 * la liste entière une fois et le filtrage se fait dans le navigateur, sans
 * aller-retour ni anti-rebond à régler.
 */
export function useWorkspaceUsers() {
  const key = "users";
  const [resolved, setResolved] = useState<Resolved<Paginated<WorkspaceUser>>>({
    key: "",
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    api
      .listUsers({ per_page: 100 }, controller.signal)
      .then((data) => setResolved({ key, data, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });

    return () => controller.abort();
  }, []);

  return {
    users: resolved.data?.items ?? [],
    total: resolved.data?.total ?? 0,
    loading: resolved.key !== key,
    error: resolved.error,
  };
}

export function useRoles() {
  const key = "roles";
  const [resolved, setResolved] = useState<Resolved<Role[]>>({
    key: "",
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    api
      .listRoles(controller.signal)
      .then((data) => setResolved({ key, data: data.items, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });

    return () => controller.abort();
  }, []);

  return {
    roles: resolved.data ?? [],
    loading: resolved.key !== key,
    error: resolved.error,
  };
}
