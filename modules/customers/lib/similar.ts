import { apiFetch } from "@/shared/api/client";

/**
 * Une fiche qui ressemble à celle qu'on s'apprête à créer (29/09).
 *
 * Le score est le meilleur de deux mesures trigramme côté serveur : le nom
 * entier, ou un nom contenu dans l'autre — « Coppens » dans « Coppens — SAS La
 * Petite Étoile ». L'adresse et le téléphone voyagent à côté, jamais dedans.
 */
export type SimilarCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  score: number;
  same_email: boolean;
  same_phone: boolean;
};

export type SimilarQuestion = { name: string; email: string; phone: string };

/**
 * Les fiches proches, au seuil de Réglages → Doublons.
 *
 * Trigramme et non plein texte : « Theussien » ne trouve pas « Theuwissen »
 * par mots, et « Coppens-Charbonnier » exigeait les deux mots à la fois.
 */
export function findSimilarCustomers(question: SimilarQuestion, signal?: AbortSignal) {
  const params = new URLSearchParams({
    name: question.name.trim(),
    email: question.email.trim(),
    phone: question.phone.trim(),
  });
  return apiFetch<{ items: SimilarCustomer[] }>(`/v1/customers/similar?${params}`, { signal }).then(
    (page) => page.items,
  );
}

/** Ce qui coïncide, dit en clair : c'est ce qui décide qu'il s'agit du même client. */
export function similarReason(item: SimilarCustomer): string {
  if (item.same_email && item.same_phone) return "même adresse et même téléphone";
  if (item.same_email) return "même adresse";
  if (item.same_phone) return "même téléphone";
  return `nom proche à ${Math.round(item.score * 100)} %`;
}

/** La clé d'une réponse : « Créer quand même » ne vaut que pour ces fiches-là. */
export function similarKey(items: SimilarCustomer[]): string {
  return items
    .map((item) => item.id)
    .sort()
    .join(",");
}
