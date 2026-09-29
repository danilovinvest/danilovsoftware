import { parseAmountInput } from "./amount";
import { fromCents, toCents } from "./credit-notes";

/**
 * Affecter un encaissement en attente à des pièces — la règle de
 * `planAllocation` côté serveur, relue pendant la saisie pour dire ce qui
 * restera en attente avant le clic.
 *
 * Module pur : chaque part se tape à la française, une part vide n'affecte
 * rien, une part illisible bloque, et la somme ne dépasse jamais ce qui a été
 * reçu. Elle peut lui être inférieure — le reste attend encore.
 */
export type AllocationDraft = { quoteId: string; amount: string };

export type AllocationPlan = {
  parts: Array<{ quote_id: string; amount: string }>;
  /** Ce qui restera en attente, « 0.00 » quand tout est affecté. */
  remaining: string;
  /** Pourquoi on ne peut pas encore affecter, nul quand on peut. */
  error: string | null;
};

export function allocationPlan(total: string, drafts: AllocationDraft[]): AllocationPlan {
  const received = toCents(total) ?? 0;
  const parts: AllocationPlan["parts"] = [];
  let sum = 0;
  for (const draft of drafts) {
    const parsed = parseAmountInput(draft.amount);
    if (parsed === undefined) {
      return { parts, remaining: fromCents(received - sum), error: "Un montant est illisible." };
    }
    if (parsed === null) continue;
    const cents = toCents(parsed) ?? 0;
    if (cents <= 0) continue;
    sum += cents;
    parts.push({ quote_id: draft.quoteId, amount: parsed });
  }
  const remaining = received - sum;
  if (remaining < 0) {
    return { parts, remaining: fromCents(remaining), error: "Les parts dépassent l'encaissement." };
  }
  if (parts.length === 0) {
    return { parts, remaining: fromCents(remaining), error: "Aucune part à affecter." };
  }
  return { parts, remaining: fromCents(remaining), error: null };
}
