import { apiFetch } from "@/shared/api/client";
import type { WorksiteResult } from "./types";

/**
 * Les chantiers : les affaires signées, servies avec l'heure du serveur.
 *
 * Un seul appel peint l'écran. Les devis voyagent avec chaque chantier — cent
 * dix chantiers ne doivent pas coûter cent dix requêtes de plus.
 */
export function listWorksites(city: string, issuer: string, signal?: AbortSignal) {
  const query = new URLSearchParams();
  if (city) query.set("city", city);
  if (issuer) query.set("issuer", issuer);
  const suffixe = query.toString();
  return apiFetch<WorksiteResult>(
    `/v1/worksites${suffixe ? `?${suffixe}` : ""}`,
    { signal },
  );
}
