"use client";

import { useMemo, useState } from "react";
import { LIVE, useCached } from "@/shared/api/cache";
import { listInvoices, toInvoice } from "../lib/live";
import { buildBillingSnapshot } from "../lib/snapshot";
import type { Period } from "../lib/types";

/**
 * Source de l'écran de facturation et de la trésorerie.
 *
 * Les factures viennent de la base (`GET /v1/invoices`, dans le périmètre du
 * compte) par le cache partagé : revenir sur l'écran est instantané. Tout le
 * reste se dérive d'elles, avec le jour du serveur — deux postes mal réglés
 * n'affichent pas deux retards différents. Le choix de la société et de la
 * période ne refait aucun appel : ce sont deux lectures des mêmes factures.
 */
export function useBilling(initialEntity: string | null = null) {
  const [period, setPeriod] = useState<Period>("90j");
  /** null = vue consolidée du groupe. */
  const [entityId, setEntityId] = useState<string | null>(initialEntity);
  const { data: raw, error, isLoading, mutate } = useCached("billing:invoices", () => listInvoices(), LIVE);

  const data = useMemo(() => {
    if (!raw) return null;
    const invoices = raw.items.map((item) => toInvoice(item, raw.today));
    return buildBillingSnapshot(invoices, period, entityId, raw.today);
  }, [raw, period, entityId]);

  return {
    data,
    error,
    loading: isLoading && !raw,
    reload: () => void mutate(),
    period,
    setPeriod,
    entityId,
    setEntityId,
  };
}
