import { COLD_DAYS, FRESH_DAYS } from "./cycle";
import type { AwaitingQuote } from "./awaiting-api";

/**
 * Les devis sans réponse, rangés par ce qu'il faut en faire.
 *
 * Les seuils sont ceux du cycle, partagés et non redits : en deçà de
 * `FRESH_DAYS` le client lit encore, au-delà de `COLD_DAYS` le devis dort. Une
 * relance remet le compteur à zéro — on ne relance pas deux fois la même
 * semaine —, et un devis sans date d'émission se range à part : son attente ne
 * se compte pas, et le deviner serait pire que le dire.
 *
 * Module **pur** : le jour vient du serveur (`today`), jamais de l'horloge du
 * poste.
 */

export type AwaitingBucket = "a_relancer" | "en_attente" | "dormant" | "sans_date";

export const AWAITING_ORDER: AwaitingBucket[] = ["a_relancer", "en_attente", "dormant", "sans_date"];

export const AWAITING_LABEL: Record<AwaitingBucket, { label: string; hint: string }> = {
  a_relancer: {
    label: "À relancer",
    hint: `Envoyés depuis plus de ${FRESH_DAYS} jours, sans relance depuis.`,
  },
  en_attente: {
    label: "Le client lit encore",
    hint: `Envoyés ou relancés il y a moins de ${FRESH_DAYS} jours.`,
  },
  dormant: {
    label: "Dormants",
    hint: `Plus de ${COLD_DAYS} jours sans réponse : à relancer une dernière fois, ou à clore.`,
  },
  sans_date: {
    label: "Date d'émission inconnue",
    hint: "L'attente ne se compte pas : la date se lit dans le PDF, ou se saisit sur le devis.",
  },
};

const DAY = 86_400_000;

/** Les jours entiers entre un jour (AAAA-MM-JJ) ou un instant et `today`. */
export function daysBetween(today: string, iso: string | null): number | null {
  if (!iso) return null;
  const end = Date.parse(today.slice(0, 10));
  const start = Date.parse(iso.slice(0, 10));
  if (Number.isNaN(end) || Number.isNaN(start)) return null;
  return Math.round((end - start) / DAY);
}

export interface AwaitingRead {
  quote: AwaitingQuote;
  bucket: AwaitingBucket;
  /** Jours depuis l'émission, nul sans date. */
  waiting: number | null;
  /** Jours depuis la dernière relance, nul sans relance. */
  sinceRelance: number | null;
}

export function readAwaiting(quote: AwaitingQuote, today: string): AwaitingRead {
  const waiting = daysBetween(today, quote.issued_at);
  const sinceRelance = daysBetween(today, quote.last_relance_at);
  return { quote, waiting, sinceRelance, bucket: bucketOf(waiting, sinceRelance) };
}

function bucketOf(waiting: number | null, sinceRelance: number | null): AwaitingBucket {
  if (waiting === null) return "sans_date";
  if (waiting > COLD_DAYS) return "dormant";
  const quiet = Math.min(waiting, sinceRelance ?? Number.POSITIVE_INFINITY);
  return quiet > FRESH_DAYS ? "a_relancer" : "en_attente";
}

/**
 * Les tranches dans l'ordre où on les traite : dans chacune, la plus longue
 * attente d'abord — c'est celle qu'on risque de perdre.
 */
export function groupAwaiting(
  quotes: AwaitingQuote[],
  today: string,
): Array<{ bucket: AwaitingBucket; reads: AwaitingRead[] }> {
  const reads = quotes.map((quote) => readAwaiting(quote, today));
  return AWAITING_ORDER.map((bucket) => ({
    bucket,
    reads: reads
      .filter((read) => read.bucket === bucket)
      .sort(
        (a, b) =>
          (b.waiting ?? -1) - (a.waiting ?? -1) ||
          a.quote.customer_name.localeCompare(b.quote.customer_name, "fr"),
      ),
  })).filter((group) => group.reads.length > 0);
}

/** Le montant en jeu d'une liste, TTC à défaut de HT, au centime entier. */
export function amountAtStake(reads: AwaitingRead[]): number {
  const cents = reads.reduce((sum, { quote }) => {
    const value = Number(quote.amount_ttc ?? quote.amount_ht ?? 0);
    return sum + (Number.isFinite(value) ? Math.round(value * 100) : 0);
  }, 0);
  return cents / 100;
}
