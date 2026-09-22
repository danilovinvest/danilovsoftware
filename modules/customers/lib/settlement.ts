/**
 * Où en est le règlement d'une affaire, et sur quelle pièce il s'écrit.
 *
 * Trois écrans le lisaient chacun à sa façon : la fiche prenait le premier devis
 * signé, la fiche latérale d'un chantier le premier devis signé **ou** le premier
 * venu, et les listes Chantiers et Études n'importe quelle pièce réglée. Une
 * affaire à plusieurs devis était ainsi « soldée » dans une liste et
 * « acompte attendu » dans la fiche ouverte depuis cette même liste.
 *
 * La règle unique part d'un fait mesuré le 22/09 : sur 154 acomptes reçus, **135
 * sont portés par une facture** (`FA…`), que la copie OneDrive range comme une
 * pièce réalisée, et 19 par un devis. Le règlement se lit donc sur la pièce la
 * plus avancée de l'affaire, quelle qu'elle soit — et c'est sur cette même
 * pièce qu'on écrit, pour que « retirer l'encaissement » retire bien ce que
 * l'écran montre.
 *
 * Module pur, sans React ni réseau : la fiche, la fiche latérale et les listes
 * l'importent tous.
 */

type Payment = "non_applicable" | "en_attente" | "recu" | (string & {});

export type SettlementQuote = {
  status: string;
  issued_at: string | null;
  deposit_status: Payment;
  balance_status: Payment;
};

/** Plus le règlement est avancé, plus le rang est haut. */
function rank(quote: SettlementQuote): number {
  if (quote.balance_status === "recu") return 3;
  if (quote.deposit_status === "recu") return 2;
  if (quote.deposit_status === "en_attente") return 1;
  return 0;
}

function signed(quote: SettlementQuote): boolean {
  return quote.status === "accepte" || quote.status === "realise";
}

/** La plus récente, les pièces sans date en dernier. */
function newest<Q extends SettlementQuote>(quotes: Q[]): Q {
  return quotes.reduce((best, quote) =>
    (quote.issued_at ?? "") > (best.issued_at ?? "") ? quote : best,
  );
}

/**
 * La pièce qui porte le règlement de l'affaire.
 *
 * La plus avancée en règlement d'abord ; entre égales, une pièce signée, puis
 * la plus récente. Sans aucun règlement, le devis signé le plus récent, à défaut
 * le dernier envoyé, à défaut le dernier tout court. Nulle sans pièce.
 */
export function paymentCarrier<Q extends SettlementQuote>(quotes: Q[]): Q | null {
  if (quotes.length === 0) return null;
  const top = Math.max(...quotes.map(rank));
  const candidates = quotes.filter((quote) => rank(quote) === top);
  const signes = candidates.filter(signed);
  if (signes.length > 0) return newest(signes);
  if (top > 0) return newest(candidates);
  const envoyes = quotes.filter((quote) => quote.status === "envoye");
  return newest(envoyes.length > 0 ? envoyes : quotes);
}

/** Acompte et solde de l'affaire, lus sur la pièce qui les porte. */
export function settlementOf(quotes: SettlementQuote[]): {
  deposit: Payment;
  balance: Payment;
} {
  const carrier = paymentCarrier(quotes);
  return {
    deposit: carrier?.deposit_status ?? "non_applicable",
    balance: carrier?.balance_status ?? "non_applicable",
  };
}
