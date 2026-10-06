import { apiFetch } from "@/shared/api/client";
import type { CustomerDetail, Quote } from "./types";

/**
 * Qui règle une affaire à la place de sa fiche (migration 107) : AGEFIM pour la
 * SDC du Marot, la SAS La Petite Étoile plutôt que la SCI.
 *
 * Le payeur vit sur l'affaire et ne s'écrit que par sa route : le formulaire de
 * l'affaire ne le porte pas, et l'effacerait. `null` rend la main à la fiche.
 */
export function setProjectPayer(projectId: string, customerId: string | null) {
  return apiFetch<void>(`/v1/projects/${projectId}/payer`, {
    method: "PUT",
    body: { customer_id: customerId },
  });
}

/**
 * Les pièces qu'un virement reçu de cette fiche peut régler : les siennes, puis
 * celles des affaires qu'elle paie pour d'autres. `owners` nomme la fiche de
 * chaque pièce qui n'est pas la sienne — « pour SDC Le Marot » —, pour qu'on ne
 * confonde pas deux factures au même intitulé.
 *
 * Pur : l'écran d'affectation et la fiche du payeur lisent la même liste.
 */
export function piecesForPayer(detail: Pick<CustomerDetail, "quotes" | "pays_for">): {
  quotes: Quote[];
  owners: Record<string, string>;
} {
  const paid = detail.pays_for;
  if (!paid || paid.quotes.length === 0) return { quotes: detail.quotes, owners: {} };
  const byProject = new Map(paid.projects.map((p) => [p.id, p.customer_name]));
  const owners: Record<string, string> = {};
  for (const quote of paid.quotes) owners[quote.id] = byProject.get(quote.project_id) ?? "";
  const own = new Set(detail.quotes.map((q) => q.id));
  return { quotes: [...detail.quotes, ...paid.quotes.filter((q) => !own.has(q.id))], owners };
}
