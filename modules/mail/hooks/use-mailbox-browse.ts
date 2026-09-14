"use client";

import { useEffect, useState } from "react";
import * as api from "../lib/api";
import type { BrowseMessage, MailKind, MailPage, MailScope } from "../lib/types";

/**
 * Parcourir la boîte.
 *
 * Le motif `Resolved` du reste du CRM : la clé de la requête voyage avec son
 * résultat, et `loading` s'en déduit. Un `setLoading(true)` dans l'effet
 * produirait un rendu de plus et se ferait refuser par le compilateur React.
 */
type Resolved = { key: string; page: MailPage | null; error: string | null };

/**
 * `pulse` avance quand la boîte a apporté du nouveau (voir `useMailPulse`) :
 * il entre dans la clé, si bien que la page se relit sans qu'on y touche.
 */
export function useMailboxBrowse(pulse = 0) {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<MailScope>("tous");
  const [kind, setKind] = useState<MailKind>("tous");
  const [from, setFrom] = useState("");
  /** La boîte lue. Vide = toutes, ce qui est le défaut. */
  const [account, setAccount] = useState("");
  const [page, setPage] = useState(1);
  // Relire la même page après un geste — un rattachement — sans changer de
  // filtre : le jeton entre dans la clé, et la clé décide de la requête.
  const [token, setToken] = useState(0);

  // La recherche attend qu'on cesse de taper : neuf mille lignes se cherchent
  // vite, mais une requête par frappe reste une requête par frappe.
  const debounced = useDebounced(search, 300);
  const key = JSON.stringify({ debounced, scope, kind, from, account, page, token, pulse });

  const [resolved, setResolved] = useState<Resolved>({ key: "", page: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    api
      .browseMail({ search: debounced, scope, kind, from, account, page }, controller.signal)
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
  }, [key, debounced, scope, kind, from, account, page]);

  return {
    page: resolved.page,
    loading: resolved.key !== key,
    error: resolved.error,
    reload: () => setToken((value) => value + 1),
    search,
    setSearch: (value: string) => {
      setSearch(value);
      /*
        Chercher, c'est chercher partout.

        La boîte choisie restait appliquée pendant qu'on tapait : on avait
        cliqué « omptgroupe » pour lire une conversation, puis on cherchait un
        client écrit à STRUCTURE, et rien ne remontait. Une recherche repasse
        donc sur toutes les boîtes ; chaque ligne dit de laquelle elle vient,
        et on peut rechoisir une boîte ensuite pour affiner.
      */
      if (value.trim() !== "") setAccount("");
      setPage(1);
    },
    scope,
    setScope: (value: MailScope) => {
      setScope(value);
      setPage(1);
    },
    kind,
    setKind: (value: MailKind) => {
      setKind(value);
      setPage(1);
    },
    from,
    setFrom: (value: string) => {
      setFrom(value);
      setPage(1);
    },
    account,
    setAccount: (value: string) => {
      setAccount(value);
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
  const [token, setToken] = useState(0);
  const key = id ? `${id}#${token}` : "";
  const [resolved, setResolved] = useState<{
    key: string;
    message: BrowseMessage | null;
    error: string | null;
  }>({ key: "", message: null, error: null });

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    api
      .getMessage(id, controller.signal)
      .then((message) => setResolved({ key, message, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResolved({
          key,
          message: null,
          error: error instanceof Error ? error.message : "Message illisible.",
        });
      });
    return () => controller.abort();
  }, [id, key]);

  // Le résultat n'est rendu que s'il porte sur le message demandé. Vider l'état
  // à la fermeture serait un `setState` dans l'effet, que le compilateur React
  // refuse — et qui coûterait un rendu de plus pour le même affichage.
  const current = key !== "" && resolved.key === key;
  return {
    message: current ? resolved.message : null,
    loading: id !== null && !current,
    error: current ? resolved.error : null,
    // Relire le message après un geste qui le change — un rattachement.
    reload: () => setToken((value) => value + 1),
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
