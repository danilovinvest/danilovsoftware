"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { CustomerDetail } from "../lib/types";

type Resolved = { key: string; data: CustomerDetail | null; error: string | null };

/** Charge la fiche complète (contacts, projets, devis, échanges) en un appel. */
export function useCustomer(id: string) {
  const [reloadToken, setReloadToken] = useState(0);
  const key = `${id}#${reloadToken}`;

  const [resolved, setResolved] = useState<Resolved>({
    key: "",
    data: null,
    error: null,
  });

  // Dérivé plutôt que stocké : évite un setState synchrone dans l'effet.
  const loading = resolved.key !== key;

  useEffect(() => {
    const controller = new AbortController();

    api
      .getCustomer(id, controller.signal)
      .then((data) => setResolved({ key, data, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });

    return () => controller.abort();
  }, [id, key]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  return { customer: resolved.data, loading, error: resolved.error, reload };
}
