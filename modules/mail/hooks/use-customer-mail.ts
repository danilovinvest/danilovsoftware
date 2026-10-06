"use client";

import { useEffect } from "react";
import useSWRInfinite from "swr/infinite";
import { LIVE } from "@/shared/api/cache";
import * as api from "../lib/api";
import { useMailPulse } from "./use-mail";
import type { MailMessage } from "../lib/types";

/** Une page de l'onglet : assez pour une fiche ordinaire, sans charger huit mille lignes. */
export const CUSTOMER_MAIL_PAGE = 50;

type Page = { items: MailMessage[]; total: number };

/**
 * Les courriels d'une fiche, page après page (issue 88).
 *
 * La liste s'arrêtait aux cent premiers, sans rien pour aller voir plus loin.
 * « Charger plus » ajoute une page sous les autres ; le cache garde celles déjà
 * lues, si bien que revenir sur l'onglet est instantané. Elles se relisent
 * toutes quand la boîte apporte du nouveau.
 *
 * `project` restreint à un chantier (migration 112) — l'identifiant d'une
 * affaire, ou « none » — et entre dans la clé : chaque tri a ses pages.
 *
 * Les pages passent par `apiFetch`, comme toute lecture du CRM : `useSWRInfinite`
 * n'est que la forme « par pages » du cache partagé, sous le même préfixe.
 */
export function useCustomerMailPages(customerId: string, project = "") {
  const pulse = useMailPulse();
  const result = useSWRInfinite<Page>(
    (index, previous: Page | null) =>
      previous && previous.items.length < CUSTOMER_MAIL_PAGE
        ? null
        : `mail:customer:${customerId}:${project}:${index}`,
    (key: string) => {
      const index = Number(key.split(":").pop());
      return api.listCustomerMail(customerId, CUSTOMER_MAIL_PAGE, undefined, index * CUSTOMER_MAIL_PAGE, project);
    },
    { ...LIVE, revalidateFirstPage: false },
  );

  const { mutate } = result;
  useEffect(() => {
    if (pulse > 0) void mutate();
  }, [pulse, mutate]);

  const pages = result.data ?? [];
  const messages = pages.flatMap((page) => page.items);
  // Le compteur n'est pas plafonné : c'est lui qui dit ce que « tout retirer » fera.
  const total = pages[0]?.total ?? 0;

  return {
    messages,
    total,
    loading: result.data === undefined && !result.error,
    loadingMore: result.isValidating && result.size > pages.length,
    error: result.error,
    hasMore: messages.length < total,
    loadMore: () => void result.setSize(result.size + 1),
    reload: () => void mutate(),
    mutate,
  };
}
