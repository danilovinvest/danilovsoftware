import { apiFetch } from "@/shared/api/client";
import type { CustomersGraph } from "./types";

/**
 * Le graphe entier du périmètre. `issuer` ne sert qu'aux comptes de tout le
 * groupe : un compte lié lit sa société, quoi qu'il demande.
 */
export function getCustomersGraph(issuer?: string, signal?: AbortSignal) {
  return apiFetch<CustomersGraph>("/v1/customers/graph", {
    query: { issuer: issuer || undefined },
    signal,
  });
}

/** L'empreinte seule : une requête, aucune fiche lue. */
export function getCustomersGraphVersion(signal?: AbortSignal) {
  return apiFetch<{ version: string }>("/v1/customers/graph/version", { signal });
}
