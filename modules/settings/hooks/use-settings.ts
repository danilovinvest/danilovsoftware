"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listPasskeys,
  listSessions,
  type DeviceSession,
  type Passkey,
} from "@/modules/auth";
import {
  listAccounts,
  listCalendars,
  listMirror,
  type Calendar,
  type GoogleAccount,
  type MirrorCalendar,
} from "@/modules/calendar";
import type { Paginated } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type {
  Invitation,
  McpToken,
  PasskeyEnrollment,
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

/**
 * Combien de clés d'accès porte chaque compte.
 *
 * C'est la seule question qui commande la bascule voulue par le dirigeant — on
 * ne coupe les mots de passe que lorsque plus personne n'est à zéro — et elle a
 * son propre point d'accès plutôt qu'un champ sur la fiche d'un compte, qui
 * vaudrait zéro partout sauf dans la liste.
 *
 * Un compte absent de la réponse n'a aucune clé : c'est un `GROUP BY`, pas une
 * ligne par personne. La carte le rend explicite pour l'écran.
 */
export function usePasskeyCoverage(enabled: boolean) {
  const [token, setToken] = useState(0);
  const key = enabled ? `passkey-coverage:${token}` : "disabled";
  const [resolved, setResolved] = useState<Resolved<Map<string, number>>>({
    key: "disabled",
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    api
      .passkeyCoverage(controller.signal)
      .then((data) =>
        setResolved({
          key,
          data: new Map(data.items.map((entry) => [entry.user_id, entry.keys])),
          error: null,
        }),
      )
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });

    return () => controller.abort();
  }, [key, enabled]);

  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    keysByUser: resolved.data ?? new Map<string, number>(),
    loading: resolved.key !== key,
    error: resolved.error,
    reload,
  };
}

/** Les liens d'enrôlement encore en circulation, pour les voir et les refermer. */
export function usePasskeyEnrollments(enabled: boolean) {
  const [token, setToken] = useState(0);
  const key = enabled ? `passkey-enrollments:${token}` : "disabled";
  const [resolved, setResolved] = useState<Resolved<PasskeyEnrollment[]>>({
    key: "disabled",
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    api
      .listPasskeyEnrollments(controller.signal)
      .then((data) => setResolved({ key, data: data.items, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });

    return () => controller.abort();
  }, [key, enabled]);

  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    enrollments: resolved.data ?? [],
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
 * Les clés d'accès du compte courant.
 *
 * `configured` vient du serveur : sans domaine public lisible, les passkeys
 * sont éteintes, et l'écran le dit plutôt que d'offrir un bouton qui échouera.
 */
export function usePasskeys() {
  const [token, setToken] = useState(0);
  const key = `passkeys:${token}`;
  const [resolved, setResolved] = useState<
    Resolved<{ items: Passkey[]; configured: boolean }>
  >({ key: "", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();

    listPasskeys(controller.signal)
      .then((data) => setResolved({ key, data, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });

    return () => controller.abort();
  }, [key]);

  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    passkeys: resolved.data?.items ?? [],
    configured: resolved.data?.configured ?? false,
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
 * Tout ce que l'écran « Agenda » montre, demandé d'un coup.
 *
 * Les agendas du CRM, le compte Google raccordé, et ce que son miroir contient.
 * Trois chargements séparés afficheraient un écran à moitié vrai le temps que
 * les derniers arrivent, et l'un ne se lit pas sans les autres : « importer »
 * n'a de sens qu'en voyant à la fois la source et la destination.
 */
export function useGoogleCalendar() {
  const [token, setToken] = useState(0);
  const key = `agenda:${token}`;
  const [resolved, setResolved] = useState<
    Resolved<{
      accounts: GoogleAccount[];
      configured: boolean;
      calendars: Calendar[];
      mirror: MirrorCalendar[];
    }>
  >({ key: "", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      listAccounts(controller.signal),
      listCalendars(controller.signal),
      listMirror(controller.signal),
    ])
      .then(([accounts, calendars, mirror]) =>
        setResolved({
          key,
          data: {
            accounts: accounts.items,
            configured: accounts.configured,
            calendars: calendars.items,
            mirror: mirror.items,
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
    mirror: resolved.data?.mirror ?? [],
    /** L'application Google est-elle déclarée sur le serveur ? */
    configured: resolved.data?.configured ?? false,
    loading: resolved.key !== key,
    error: resolved.error,
    reload,
  };
}
