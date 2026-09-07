import { apiFetch } from "@/shared/api/client";
import type { WorksiteResult } from "./types";

/**
 * Les chantiers : les affaires signées, servies avec l'heure du serveur.
 *
 * Un seul appel peint l'écran. Les devis voyagent avec chaque chantier — cent
 * dix chantiers ne doivent pas coûter cent dix requêtes de plus.
 */
export function listWorksites(city: string, signal?: AbortSignal) {
  const query = city ? `?city=${encodeURIComponent(city)}` : "";
  return apiFetch<WorksiteResult>(`/v1/worksites${query}`, { signal });
}
