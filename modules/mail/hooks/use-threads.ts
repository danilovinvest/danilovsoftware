"use client";

import { useEffect } from "react";
import { LIVE, useCached } from "@/shared/api/cache";
import * as api from "../lib/api";
import type { MailView } from "../lib/types";

export type ThreadFilters = {
  view: MailView;
  search: string;
  contact: string;
  account: string;
};

/**
 * Les conversations de la boîte, en cache.
 *
 * Revenir sur la messagerie montre tout de suite la dernière liste lue, puis la
 * revérifie ; changer de vue garde la liste précédente à l'écran le temps que la
 * suivante arrive (`keepPreviousData`), plutôt que de repeindre un squelette à
 * chaque clic. Quand la boîte apporte du nouveau (`pulse`, tiré de
 * `useMailPulse` par l'écran, une fois pour la liste et la conversation), la
 * liste se relit d'elle-même — sans que la clé change, donc sans clignoter.
 */
export function useThreads(filters: ThreadFilters, limit: number, pulse: number) {
  const key = `mail:threads:${JSON.stringify({ ...filters, limit })}`;
  const result = useCached(
    key,
    () =>
      api.listThreads({
        view: filters.view,
        search: filters.search || undefined,
        contact: filters.contact || undefined,
        account: filters.account || undefined,
        limit,
      }),
    { ...LIVE, keepPreviousData: true },
  );

  const { mutate } = result;
  useEffect(() => {
    if (pulse > 0) void mutate();
  }, [pulse, mutate]);

  return result;
}

/**
 * Une conversation ouverte, en cache par message : rouvrir celle qu'on vient de
 * quitter est instantané. Elle se relit aussi quand la boîte apporte du
 * nouveau — une réponse arrivée pendant qu'on lit doit apparaître.
 */
/** La clé de cache d'une conversation ouverte par ce message. */
export function threadCacheKey(messageId: string): string {
  return `mail:thread:${messageId}`;
}

export function useThread(messageId: string | null, pulse: number) {
  const result = useCached(messageId ? threadCacheKey(messageId) : null, () =>
    api.getThread(messageId as string),
  );
  const { mutate } = result;
  useEffect(() => {
    if (pulse > 0) void mutate();
  }, [pulse, mutate]);
  return result;
}

/**
 * Le corps d'un message, demandé au dépliage quand il n'a jamais été copié.
 *
 * `null` ne demande rien : le corps est déjà là. La première demande peut
 * prendre une seconde, le temps d'une connexion IMAP ; les suivantes lisent la
 * base, puis le cache.
 */
export function useMessageBody(messageId: string | null) {
  return useCached(messageId ? `mail:message:${messageId}` : null, () =>
    api.getMessage(messageId as string),
  );
}

/** Le même corps, lu depuis la fiche qui porte le courriel (issue 88). */
export function useCustomerMessageBody(customerId: string, messageId: string | null) {
  return useCached(
    messageId ? `mail:customer-message:${customerId}:${messageId}` : null,
    () => api.getCustomerMessage(customerId, messageId as string),
  );
}
