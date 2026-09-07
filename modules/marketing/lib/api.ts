import { apiFetch } from "@/shared/api/client";
import type { Article, Realisation } from "./types";

/**
 * Les réalisations : les affaires réalisées et leur article.
 *
 * Un seul appel. Les affaires **sans** article y figurent aussi : c'est la
 * comparaison des deux qui intéresse l'écran, et une liste qui ne montrerait
 * que les articles écrits ne dirait jamais ce qu'il reste à écrire.
 */
export function listRealisations(signal?: AbortSignal) {
  return apiFetch<{ items: Realisation[] }>("/v1/realisations", { signal });
}

/** L'article d'une affaire. Créé ou remplacé — l'écran n'a pas à savoir. */
export function saveRealisation(projectId: string, article: Omit<Article, "published_at" | "updated_at">) {
  return apiFetch<Article>(`/v1/realisations/${projectId}`, {
    method: "PUT",
    body: article,
  });
}

/** Efface l'article, pas l'affaire : la réalisation redevient « à rédiger ». */
export function deleteRealisation(projectId: string) {
  return apiFetch<void>(`/v1/realisations/${projectId}`, { method: "DELETE" });
}
