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

/**
 * Ce qu'une pièce dit de son règlement — de quoi lire les deux crans.
 */
export type FactQuote = SettlementQuote & {
  id: string;
  piece: "devis" | "facture";
  invoice_kind: string | null;
  source_quote_id: string | null;
  amount_ttc: string | null;
  deposit_amount: string | null;
  deposit_paid_at: string | null;
  balance_amount: string | null;
  balance_paid_at: string | null;
};

/** Un cran de règlement : franchi, quand, par un paiement ou par une marque. */
export type SettlementFact = {
  done: boolean;
  at: string | null;
  /** Franchi par un paiement : il ne se retire qu'en annulant ce paiement. */
  fact: boolean;
  /** La pièce qui porte la marque, quand le cran n'est franchi que par elle. */
  markOn: string | null;
};

const NOT_DONE: SettlementFact = { done: false, at: null, fact: false, markOn: null };

const live = <Q extends FactQuote>(quotes: Q[]) => quotes.filter((q) => q.status !== "annule");
const isDepositInvoice = (q: FactQuote) => q.piece === "facture" && q.invoice_kind === "acompte";
/** Une facture qui ne solde pas le marché à elle seule. */
const isPartialInvoice = (q: FactQuote) =>
  q.piece === "facture" &&
  (q.invoice_kind === "acompte" || q.invoice_kind === "situation" || q.invoice_kind === "avoir");

function latest(a: string | null, b: string | null): string | null {
  if (b === null) return a;
  if (a === null) return b;
  return b > a ? b : a;
}

function num(v: string | null): number {
  const n = v === null ? Number.NaN : Number.parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

/** Le plus récent selon une date, les pièces sans date en dernier. */
function newestBy<Q>(quotes: Q[], date: (q: Q) => string | null): Q {
  return quotes.reduce((best, q) => ((date(q) ?? "") > (date(best) ?? "") ? q : best));
}

/**
 * Le marché, l'encaissé, et s'ils se comptent — la règle de `montant_du_marche`
 * et `montant_encaisse`, sur les montants que chaque pièce porte (le serveur y
 * recopie la somme des virements). Une pièce dont une facture est tirée ne
 * compte plus pour elle-même — un avoir, lui, n'éteint pas sa facture.
 */
function marketAndCollected(quotes: FactQuote[]): { market: number; collected: number; known: boolean } {
  // Un avoir ne fait pas de sa facture une « mère » : elle garde ses
  // encaissements (migration 105).
  const mothers = new Set(
    quotes
      .filter((q) => q.invoice_kind !== "avoir")
      .map((q) => q.source_quote_id)
      .filter((id) => id !== null),
  );
  let signed = 0;
  let offered = 0;
  let hasSigned = false;
  let collected = 0;
  let known = true;
  for (const q of live(quotes)) {
    if (q.piece !== "facture") {
      if (q.status === "accepte" || q.status === "realise") {
        signed += num(q.amount_ttc);
        hasSigned = true;
      } else if (q.status !== "refuse") offered += num(q.amount_ttc);
    }
    if (mothers.has(q.id)) continue;
    const reglements = [
      [q.deposit_status, q.deposit_amount],
      [q.balance_status, q.balance_amount],
    ] as const;
    for (const [status, amount] of reglements) {
      if (status !== "recu") continue;
      if (amount === null) known = false;
      collected += num(amount);
    }
  }
  const market = hasSigned ? signed : offered;
  return { market, collected, known: known && market > 0 };
}

/**
 * L'acompte : **le fait l'emporte sur la marque**. Une facture d'acompte payée
 * franchit le cran au jour de son paiement, quel que soit le jour qu'une marque
 * posée à la main disait ; à défaut, une pièce dont l'acompte est marqué reçu
 * le franchit, et c'est cette marque que « Retirer » retire.
 *
 * Même règle que `customers.DepositFact` côté serveur, que le connecteur lit.
 */
export function depositFact(quotes: FactQuote[]): SettlementFact {
  const paid = live(quotes).filter((q) => isDepositInvoice(q) && q.balance_status === "recu");
  if (paid.length > 0) {
    const at = paid.reduce<string | null>((acc, q) => latest(acc, q.balance_paid_at), null);
    return { done: true, at, fact: true, markOn: null };
  }
  const marked = live(quotes).filter((q) => q.deposit_status === "recu");
  if (marked.length === 0) return NOT_DONE;
  const newest = newestBy(marked, (q) => q.deposit_paid_at);
  return { done: true, at: newest.deposit_paid_at, fact: false, markOn: newest.id };
}

/**
 * Le solde : **la fin du paiement, pas un paiement**. Chez Koja, une facture de
 * situation payée — 5 150 € sur 25 300 € — cochait « Solde encaissé ». Quand
 * l'affaire dit tout de son argent, il n'est franchi qu'à 100 % payé ; sinon,
 * par une pièce soldée qui n'est ni un acompte, ni une situation, ni un avoir.
 *
 * Même règle que `customers.BalanceFact` côté serveur : les deux se citent, et
 * leurs tests figent les mêmes cas.
 */
export function balanceFact(quotes: FactQuote[]): SettlementFact {
  const { market, collected, known } = marketAndCollected(quotes);
  const closing = live(quotes).filter((q) => q.balance_status === "recu" && !isPartialInvoice(q));
  const closingAt = closing.reduce<string | null>((acc, q) => latest(acc, q.balance_paid_at), null);
  if (known) {
    if (collected < market - 0.01) return NOT_DONE;
    const last = live(quotes).reduce<string | null>(
      (acc, q) => latest(latest(acc, q.balance_paid_at), q.deposit_paid_at),
      null,
    );
    return { done: true, at: closingAt ?? last, fact: true, markOn: null };
  }
  if (closing.length === 0) return NOT_DONE;
  const newest = newestBy(closing, (q) => q.balance_paid_at);
  return { done: true, at: closingAt, fact: false, markOn: newest.id };
}

/** Les règlements qu'une pièce porte, et qui se corrigent donc sur elle. */
export function settledKinds(quote: SettlementQuote): Array<"acompte" | "solde"> {
  const kinds: Array<"acompte" | "solde"> = [];
  if (quote.deposit_status !== "non_applicable") kinds.push("acompte");
  if (quote.balance_status !== "non_applicable") kinds.push("solde");
  return kinds;
}
