"use client";

import { useEffect, useState } from "react";
import * as api from "../lib/api";
import type { BrowseMessage, MailPage, MailScope } from "../lib/types";

/**
 * Parcourir la boîte.
 *
 * Le motif `Resolved` du reste du CRM : la clé de la requête voyage avec son
 * résultat, et `loading` s'en déduit. Un `setLoading(true)` dans l'effet
 * produirait un rendu de plus et se ferait refuser par le compilateur React.
 */
type Resolved = { key: string; page: MailPage | null; error: string | null };

export function useMailboxBrowse() {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<MailScope>("tous");
  const [from, setFrom] = useState("");
  const [page, setPage] = useState(1);

  // La recherche attend qu'on cesse de taper : neuf mille lignes se cherchent
  // vite, mais une requête par frappe reste une requête par frappe.
  const debounced = useDebounced(search, 300);
  const key = JSON.stringify({ debounced, scope, from, page });

  const [resolved, setResolved] = useState<Resolved>({ key: "", page: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    api
      .browseMail({ search: debounced, scope, from, page }, controller.signal)
      .then((result) => setResolved({ key, page: result, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResolved({
          key,
          page: null,
          error: error instanceof Error ? error.message : "Boîte illisible.",
        });
      });
    return () => controller.abort();
  }, [key, debounced, scope, from, page]);

  return {
    page: resolved.page,
    loading: resolved.key !== key,
    error: resolved.error,
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    scope,
    setScope: (value: MailScope) => {
      setScope(value);
      setPage(1);
    },
    from,
    setFrom: (value: string) => {
      setFrom(value);
      setPage(1);
    },
    pageNumber: page,
    setPage,
  };
}

/**
 * Un message, corps compris.
 *
 * La première ouverture peut prendre une seconde : le serveur va chercher le
 * corps en IMAP s'il n'est pas encore en base. C'est pour cela que `loading`
 * existe ici et pas seulement dans la liste.
 */
export function useMailMessage(id: string | null) {
  const [resolved, setResolved] = useState<{
    key: string;
    message: BrowseMessage | null;
    error: string | null;
  }>({ key: "", message: null, error: null });

  useEffect(() => {
    if (!id) {
      setResolved({ key: "", message: null, error: null });
      return;
    }
    const controller = new AbortController();
    api
      .getMessage(id, controller.signal)
      .then((message) => setResolved({ key: id, message, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResolved({
          key: id,
          message: null,
          error: error instanceof Error ? error.message : "Message illisible.",
        });
      });
    return () => controller.abort();
  }, [id]);

  return {
    message: resolved.message,
    loading: id !== null && resolved.key !== id,
    error: resolved.error,
  };
}

function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
