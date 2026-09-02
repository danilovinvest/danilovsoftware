"use client";

import { useCallback, useMemo, useState } from "react";
import { buildMarketingSnapshot } from "../lib/snapshot";
import type { Article, ArticleStatus } from "../lib/types";

/**
 * État de l'écran marketing.
 *
 * Les modifications vivent dans `overrides`, indexées par chantier, et
 * l'instantané est recalculé à partir d'elles. Rien ne part au serveur : le
 * jour où `PUT /v1/realisations/{id}` existera, `save` sera le seul point à
 * changer, et l'écran ne s'en apercevra pas.
 */
export function useMarketing() {
  const [at] = useState(() => new Date());
  const [overrides, setOverrides] = useState<Record<string, Article>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ArticleStatus | "toutes">("toutes");

  const data = useMemo(() => buildMarketingSnapshot(overrides, at), [overrides, at]);

  const save = useCallback((article: Article) => {
    setOverrides((current) => ({
      ...current,
      [article.worksite_id]: { ...article, updated_at: new Date().toISOString() },
    }));
  }, []);

  const open = data.realisations.find((r) => r.worksite.id === openId) ?? null;

  const visible =
    filter === "toutes"
      ? data.realisations
      : data.realisations.filter((r) => r.article.status === filter);

  return { data, at, open, openId, setOpenId, filter, setFilter, visible, save };
}
