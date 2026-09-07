import { apiFetch } from "@/shared/api/client";

/**
 * La recherche transverse : une question, tout le CRM.
 *
 * Un seul appel plutôt que cinq. La palette interroge à chaque frappe ; cinq
 * requêtes par frappe, ce serait cinq fois la latence et cinq occasions qu'une
 * réponse lente se colle sous une frappe plus récente.
 *
 * Les sections absentes ne sont pas vides, elles sont **interdites** : le
 * serveur n'interroge que ce que le rôle courant peut lire.
 */
export type Hit = {
  id: string;
  /** Ce qu'on lit en gras : le nom, la référence, le sujet. */
  title: string;
  /** Ce qui situe : le client, la ville, la date. Vide plutôt qu'inventé. */
  hint: string;
  /** Où l'on va en validant. Le seul champ que la palette doit comprendre. */
  href: string;
  /** Étiquette courte quand elle apprend quelque chose. Vide sinon. */
  badge: string;
};

export type SearchResult = {
  customers: Hit[] | null;
  projects: Hit[] | null;
  quotes: Hit[] | null;
  tasks: Hit[] | null;
  messages: Hit[] | null;
};

export function search(q: string, signal?: AbortSignal) {
  return apiFetch<SearchResult>(
    `/v1/search?q=${encodeURIComponent(q)}&limit=5`,
    { signal },
  );
}
