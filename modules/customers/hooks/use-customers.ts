"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Paginated } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { CustomerFilters, CustomerListItem, CustomerStats } from "../lib/types";

type Resolved<T> = { key: string; data: T | null; error: string | null };

/**
 * Charge la liste des fiches. Chaque changement de filtre annule la requête
 * précédente : une frappe rapide dans la recherche ne laisse pas une réponse
 * périmée écraser la plus récente.
 */
export function useCustomers(filters: CustomerFilters) {
  const [reloadToken, setReloadToken] = useState(0);
  // Les filtres sont sérialisés pour servir de dépendance stable : un objet
  // littéral changerait d'identité à chaque rendu et relancerait la requête.
  const key = `${JSON.stringify(filters)}#${reloadToken}`;

  const [resolved, setResolved] = useState<Resolved<Paginated<CustomerListItem>>>({
    key: "",
    data: null,
    error: null,
  });

  // « En cours » est dérivé, pas stocké : aucun setState synchrone dans l'effet.
  const loading = resolved.key !== key;

  useEffect(() => {
    const controller = new AbortController();

    api
      .listCustomers(filters, controller.signal)
      .then((data) => setResolved({ key, data, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });

    return () => controller.abort();
    // `filters` est capturé via `key` : le comparer par identité relancerait
    // la requête à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  return { data: resolved.data, loading, error: resolved.error, reload };
}

export function useCustomerStats() {
  const [stats, setStats] = useState<CustomerStats | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .getStats(controller.signal)
      .then(setStats)
      .catch(() => setStats(null));
    return () => controller.abort();
  }, []);

  return stats;
}

/** Retarde la propagation d'une valeur : utilisé par le champ de recherche. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** État de filtres du tableau, avec remise à la page 1 dès qu'un filtre change. */
export function useCustomerFilters() {
  const [filters, setFilters] = useState<CustomerFilters>({
    sort: "recent",
    page: 1,
    per_page: 25,
  });

  const update = useCallback((patch: Partial<CustomerFilters>) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }, []);

  const reset = useCallback(() => {
    setFilters({ sort: "recent", page: 1, per_page: 25 });
  }, []);

  const active = useMemo(
    () =>
      Boolean(
        filters.search ||
          filters.city ||
          filters.status?.length ||
          filters.source?.length,
      ),
    [filters],
  );

  return { filters, update, reset, active };
}

/**
 * Enveloppe une mutation : gère l'état « en cours », l'erreur et les erreurs de
 * validation par champ renvoyées par l'API.
 */
export function useAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setPending(true);
      setError(null);
      setFields({});
      try {
        return await action(...args);
      } catch (cause) {
        if (mounted.current) {
          setError(errorMessage(cause));
          if (cause && typeof cause === "object" && "fields" in cause) {
            setFields((cause as { fields: Record<string, string> }).fields);
          }
        }
        return null;
      } finally {
        if (mounted.current) setPending(false);
      }
    },
    [action],
  );

  return { run, pending, error, fields };
}
