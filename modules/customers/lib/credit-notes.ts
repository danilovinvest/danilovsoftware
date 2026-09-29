/**
 * L'avoir, lu du côté de la facture qu'il annule (migration 105).
 *
 * Un avoir est une facture de nature `avoir` dont `source_quote_id` désigne la
 * facture qu'il réduit. Il se stocke positif et se compte négatif : le net à
 * payer d'une facture est son TTC moins ses avoirs vivants — la règle de
 * `net_a_payer` côté serveur, relue ici sur les pièces que l'écran a déjà.
 *
 * Module pur, sans React : la ligne d'une pièce et la boîte de l'avoir le
 * lisent tous deux. Les montants se comptent en centimes entiers.
 */

export type CreditQuote = {
  id: string;
  piece: "devis" | "facture";
  invoice_kind: string | null;
  status: string;
  source_quote_id: string | null;
  amount_ttc: string | null;
};

/** Un montant de l'API en centimes, nul quand il est illisible. */
export function toCents(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? null : Math.round(n * 100);
}

/** Des centimes comme l'API les transporte : « 1234.50 ». */
export function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function isCreditNote(q: CreditQuote): boolean {
  return q.piece === "facture" && q.invoice_kind === "avoir";
}

/** Une facture qu'un avoir peut réduire : ni un devis, ni un avoir, ni annulée. */
export function canIssueCreditNote(q: CreditQuote): boolean {
  return q.piece === "facture" && !isCreditNote(q) && q.status !== "annule";
}

/** Les avoirs vivants tirés d'une facture. */
export function creditNotesOf<Q extends CreditQuote>(invoice: CreditQuote, quotes: Q[]): Q[] {
  return quotes.filter(
    (q) => isCreditNote(q) && q.status !== "annule" && q.source_quote_id === invoice.id,
  );
}

/** Ce que les avoirs retranchent d'une facture, en centimes, toujours positif. */
export function creditedCents(invoice: CreditQuote, quotes: CreditQuote[]): number {
  return creditNotesOf(invoice, quotes).reduce(
    (sum, q) => sum + Math.abs(toCents(q.amount_ttc) ?? 0),
    0,
  );
}

/** Le net à payer : le TTC moins les avoirs. Nul quand le TTC est inconnu. */
export function netToPay(invoice: CreditQuote, quotes: CreditQuote[]): string | null {
  const ttc = toCents(invoice.amount_ttc);
  if (ttc === null) return null;
  return fromCents(ttc - creditedCents(invoice, quotes));
}

/** La facture qu'un avoir annule, quand l'écran l'a en main. */
export function cancelledInvoice<Q extends CreditQuote>(avoir: CreditQuote, quotes: Q[]): Q | null {
  if (!isCreditNote(avoir) || !avoir.source_quote_id) return null;
  return quotes.find((q) => q.id === avoir.source_quote_id) ?? null;
}
