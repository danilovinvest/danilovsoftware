/**
 * Les montants tels qu'on les tape, et tels que l'API les attend.
 *
 * On tape « 2 400,50 € », l'API attend « 2400.50 ». La conversion vivait dans
 * l'éditeur d'acompte seulement : le formulaire de devis envoyait le HT et le
 * TTC tels quels, et une virgule suffisait à faire refuser l'enregistrement.
 *
 * Module pur, sans React : le formulaire de devis, l'éditeur de règlements,
 * les virements et la sous-traitance le partagent.
 */

/**
 * Lit un montant tapé à la française : « 2 400,50 € » → « 2400.50 ».
 *
 * `undefined` dit « illisible », `null` dit « vide » — et vide est une réponse
 * légitime : on sait qu'un acompte est arrivé sans toujours savoir combien.
 */
export function parseAmountInput(text: string | null): string | null | undefined {
  const cleaned = (text ?? "").replace(/[\s  €]/g, "").replace(",", ".");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  return cleaned;
}

/**
 * Lit un taux de TVA : « 20 », « 5,5 », « 20 % ». Même contrat que les
 * montants, borné à 0–100 : au-delà, c'est une faute de frappe.
 */
export function parseRateInput(text: string | null): string | null | undefined {
  const cleaned = (text ?? "").replace(/[\s  %]/g, "").replace(",", ".");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  return Number(cleaned) > 100 ? undefined : cleaned;
}

/**
 * Un montant de l'API, prêt à être corrigé : « 8050.00 » → « 8050,00 ».
 *
 * La virgule, parce que c'est ce que l'on retape : un champ qui montre un point
 * invite à écrire la correction avec un point, puis la suivante avec une
 * virgule.
 */
export function amountToInput(value: string | null): string {
  return value ? value.replace(".", ",") : "";
}

/** Un taux de l'API, sans ses zéros inutiles : « 20.00 » → « 20 », « 5.50 » → « 5,5 ». */
export function rateToInput(value: string | null): string {
  if (!value) return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(n).replace(".", ",") : value;
}

/** Arrondi au centime, rendu dans la forme de saisie. */
function toCents(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2).replace(".", ",");
}

/**
 * Le TTC d'un HT, ou le HT d'un TTC, au taux donné. `null` dès qu'un des deux
 * est vide ou illisible : on ne calcule rien de ce qu'on ne sait pas lire.
 */
export function convertAmount(
  text: string,
  rateText: string,
  direction: "ht->ttc" | "ttc->ht",
): string | null {
  const amount = parseAmountInput(text);
  const rate = parseRateInput(rateText);
  if (!amount || !rate) return null;
  const factor = 1 + Number(rate) / 100;
  return toCents(direction === "ht->ttc" ? Number(amount) * factor : Number(amount) / factor);
}

/**
 * Le HT, le taux et le TTC se tiennent-ils, à un centime près ?
 *
 * Vrai aussi quand l'un manque : on ne peut rien reprocher à ce qu'on ne sait
 * pas lire.
 */
export function amountsAgree(htText: string, ttcText: string, rateText: string): boolean {
  const expected = convertAmount(htText, rateText, "ht->ttc");
  const ttc = parseAmountInput(ttcText);
  if (expected === null || !ttc) return true;
  return Math.abs(Number(expected.replace(",", ".")) - Number(ttc)) <= 0.011;
}
