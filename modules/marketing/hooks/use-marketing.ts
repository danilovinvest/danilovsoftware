"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import { coverage, read } from "../lib/derive";
import type { Article, ArticleStatus, Realisation } from "../lib/types";

type Resolved = { key: string; items: Realisation[] | null; error: string | null };

/**
 * L'état de l'écran marketing.
 *
 * Les modifications partent au serveur, plus dans un état local : l'écran
 * gardait ses articles dans le navigateur, et fermer l'onglet les perdait.
 * `save` écrit puis recharge — un article n'est pas assez fréquent pour mériter
 * une mise à jour optimiste, et le rechargement rend la complétude recalculée
 * par le serveur.
 */
export function useMarketing() {
  const [token, setToken] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ArticleStatus | "toutes">("toutes");
  const [saving, setSaving] = useState(false);

  const key = `realisations:${token}`;
  const [resolved, setResolved] = useState<Resolved>({
    key: "", items: null, error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    api
      .listRealisations(controller.signal)
      .then((page) => setResolved({ key, items: page.items, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, items: null, error: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [key]);

  const reads = useMemo(
    () => (resolved.items ?? []).map(read),
    [resolved.items],
  );
  const cities = useMemo(() => coverage(reads), [reads]);

  const save = useCallback(
    async (projectId: string, article: Article) => {
      setSaving(true);
      try {
        await api.saveRealisation(projectId, {
          status: article.status,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          context: article.context,
          solution: article.solution,
          result: article.result,
          keywords: article.keywords,
          quote: article.quote,
          quote_author: article.quote_author,
        });
        setToken((value) => value + 1);
        return true;
      } catch {
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const open = reads.find((r) => r.realisation.project_id === openId) ?? null;
  const visible =
    filter === "toutes"
      ? reads
      : reads.filter((r) => r.realisation.article.status === filter);

  return {
    reads,
    cities,
    visible,
    open,
    openId,
    setOpenId,
    filter,
    setFilter,
    save,
    saving,
    loading: resolved.key !== key,
    error: resolved.error,
  };
}
