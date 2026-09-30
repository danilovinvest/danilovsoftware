import type { OrderCost } from "./supplier-orders";

/**
 * La marge d'une affaire : son marché hors taxes, moins la sous-traitance et
 * le coût matière (feuille de route du 29/09, phase 4).
 *
 * Le marché suit la règle de `montant_du_marche` (migration 99), en **hors
 * taxes** puisqu'on achète hors taxes : les devis acceptés, à défaut ce qui
 * est proposé, jamais une pièce refusée ou annulée, jamais une facture — elle
 * solde un devis, l'additionner doublerait. Module pur.
 */

export type MarginQuote = {
  reference: string;
  status: string;
  amount_ht: string | null;
};

export type Margin = {
  /** Le marché hors taxes, en centimes. */
  market: number;
  /** Vrai quand le marché est celui de devis signés, faux quand il est seulement proposé. */
  signed: boolean;
  subcontracting: number;
  material: number;
  margin: number;
  /** La marge en pourcentage du marché, arrondie. */
  rate: number;
  /** Ce que la marge ignore : devis sans montant HT, commandes fermes sans montant. */
  blind: { quotes: number; orders: number };
};

const isPiece = (reference: string) => /^(FA|AV)/i.test(reference.trim());

function cents(amount: string | null): number | null {
  if (amount === null || amount === "") return null;
  const value = Math.round(Number(amount) * 100);
  return Number.isNaN(value) ? null : value;
}

/**
 * Rend la marge, ou `null` quand elle ne se calcule pas : aucun devis chiffré
 * hors taxes, ou rien à en déduire. Un « 100 % de marge » sur une affaire dont
 * personne n'a saisi les achats serait faux, pas prudent.
 */
export function projectMargin(
  quotes: MarginQuote[],
  subcontractingTotal: string | null,
  material: OrderCost,
): Margin | null {
  const devis = quotes.filter((quote) => !isPiece(quote.reference));
  const accepted = devis.filter((quote) => quote.status === "accepte" || quote.status === "realise");
  const counted =
    accepted.length > 0 ? accepted : devis.filter((quote) => quote.status !== "refuse" && quote.status !== "annule");
  let market = 0;
  let blindQuotes = 0;
  for (const quote of counted) {
    const value = cents(quote.amount_ht);
    if (value === null) blindQuotes += 1;
    else market += value;
  }
  const subcontracting = cents(subcontractingTotal) ?? 0;
  const spent = subcontracting + material.firm;
  if (market <= 0 || spent <= 0) return null;
  const margin = market - spent;
  return {
    market,
    signed: accepted.length > 0,
    subcontracting,
    material: material.firm,
    margin,
    rate: Math.round((margin / market) * 100),
    blind: { quotes: blindQuotes, orders: material.unknown },
  };
}
