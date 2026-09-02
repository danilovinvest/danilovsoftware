"use client";

import { useCallback, useEffect, useState } from "react";
import { listSessions, type DeviceSession } from "@/modules/auth";
import {
  listAccounts,
  listCalendars,
  type CalendarListEntry,
  type GoogleAccount,
} from "@/modules/calendar";
import type { Paginated } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type {
  Invitation,
  McpToken,
  PermissionEntry,
  Role,
  WorkspaceUser,
} from "../lib/types";

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
  const [token, setToken] = useState(0);
  const key = `users:${token}`;
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
  }, [key]);

  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    users: resolved.data?.items ?? [],
    total: resolved.data?.total ?? 0,
    loading: resolved.key !== key,
    error: resolved.error,
    reload,
  };
}

/**
 * Invitations en attente.
 *
 * Rechargeable comme les sessions, et pour la même raison : émettre ou révoquer
 * un lien doit se voir tout de suite — la liste est la seule preuve que le
 * bouton a fait quelque chose.
 */
export function useInvitations(enabled: boolean) {
  const [token, setToken] = useState(0);
  const key = enabled ? `invitations:${token}` : "disabled";
  const [resolved, setResolved] = useState<Resolved<Invitation[]>>({
    key: "disabled",
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    api
      .listInvitations(controller.signal)
      .then((data) => setResolved({ key, data: data.items, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });

    return () => controller.abort();
  }, [key, enabled]);

  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    invitations: resolved.data ?? [],
    loading: resolved.key !== key,
    error: resolved.error,
    reload,
  };
}

export function useRoles() {
  const [token, setToken] = useState(0);
  const key = `roles:${token}`;
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
  }, [key]);

  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    roles: resolved.data ?? [],
    loading: resolved.key !== key,
    error: resolved.error,
    reload,
  };
}

/**
 * Catalogue des permissions existantes.
 *
 * Il vient du serveur et n'est jamais recopié côté front : ajouter une
 * permission à l'API la fait apparaître dans la matrice sans toucher au front.
 */
export function usePermissionCatalog(enabled: boolean) {
  const key = enabled ? "permissions" : "disabled";
  const [resolved, setResolved] = useState<Resolved<PermissionEntry[]>>({
    key: "disabled",
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    api
      .listPermissions(controller.signal)
      .then((data) => setResolved({ key, data: data.items, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });

    return () => controller.abort();
  }, [key, enabled]);

  return {
    permissions: resolved.data ?? [],
    loading: resolved.key !== key,
    error: resolved.error,
  };
}

/**
 * Appareils connectés au compte courant.
 *
 * `reload` est exposé parce que révoquer une session doit se voir tout de
 * suite : la liste est la seule preuve que le bouton a fait quelque chose.
 */
export function useSessions() {
  const [token, setToken] = useState(0);
  const key = `sessions:${token}`;
  const [resolved, setResolved] = useState<Resolved<DeviceSession[]>>({
    key: "",
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    listSessions()
      .then((data) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: data.items, error: null });
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });

    return () => controller.abort();
  }, [key]);

  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    sessions: resolved.data ?? [],
    loading: resolved.key !== key,
    error: resolved.error,
    reload,
  };
}

/**
 * Connecteurs MCP du compte courant.
 *
 * Même forme que les autres : la réponse est rangée avec la question qui l'a
 * produite, « en cours » s'en déduit. Rechargeable, parce que créer ou révoquer
 * une adresse doit se voir tout de suite.
 */
export function useMcpTokens() {
  const [token, setToken] = useState(0);
  const key = `mcp:${token}`;
  const [resolved, setResolved] = useState<Resolved<McpToken[]>>({
    key: "",
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    api
      .listMcpTokens(controller.signal)
      .then((data) => setResolved({ key, data: data.items, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });

    return () => controller.abort();
  }, [key]);

  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    tokens: resolved.data ?? [],
    loading: resolved.key !== key,
    error: resolved.error,
    reload,
  };
}

/**
 * L'agenda Google raccordé, et les agendas qu'il expose.
 *
 * Les deux sont demandés ensemble : un compte sans ses agendas ne dit rien
 * d'utile, et deux chargements séparés afficheraient un écran à moitié vrai le
 * temps que le second arrive.
 */
export function useGoogleCalendar() {
  const [token, setToken] = useState(0);
  const key = `agenda:${token}`;
  const [resolved, setResolved] = useState<
    Resolved<{
      accounts: GoogleAccount[];
      configured: boolean;
      calendars: CalendarListEntry[];
    }>
  >({ key: "", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([listAccounts(controller.signal), listCalendars(controller.signal)])
      .then(([accounts, calendars]) =>
        setResolved({
          key,
          data: {
            accounts: accounts.items,
            configured: accounts.configured,
            calendars: calendars.items,
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

  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    accounts: resolved.data?.accounts ?? [],
    calendars: resolved.data?.calendars ?? [],
    /** L'application Google est-elle déclarée sur le serveur ? */
    configured: resolved.data?.configured ?? false,
    loading: resolved.key !== key,
    error: resolved.error,
    reload,
  };
}
