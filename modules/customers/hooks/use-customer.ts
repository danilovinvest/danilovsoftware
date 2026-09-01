"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { CustomerDetail } from "../lib/types";

/** Charge la fiche complète (contacts, projets, devis, échanges) en un appel. */
export function useCustomer(id: string) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    api
      .getCustomer(id, controller.signal)
      .then(setCustomer)
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, reloadToken]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  return { customer, loading, error, reload };
}
