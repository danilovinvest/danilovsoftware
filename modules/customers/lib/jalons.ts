import type { PaymentStatus, Quote } from "./types";

/**
 * Les jalons d'après-signature — la partie du cycle que l'API ne stocke pas
 * encore.
 *
 * Le devis porte déjà `deposit_status` : « acompte facturé » et « acompte
 * encaissé » sont donc **réels**, lus de la base. Quatre jalons manquent, et
 * ils manquent tous les quatre pour la même raison — le CRM n'a jamais suivi
 * ce qui se passe entre la signature et le premier coup de pelle :
 *
 *   • le RIB envoyé au client,
 *   • l'attestation d'assurance décennale,
 *   • la date de chantier réservée,
 *   • la commande des matériaux (béton, acier).
 *
 * Ils vivent ici, en mémoire du navigateur, sur le même patron que les
 * chantiers et la facturation : des décalages en jours dans un jeu figé, que
 * `materialize` transforme en dates à l'instant de lecture. Un écran de
 * démonstration ne vieillit donc jamais.
 *
 * **Le jour où l'API les servira, seul ce fichier changera.** C'est la même
 * couture que `hooks/use-worksites.ts` : la forme rendue est déjà celle d'une
 * réponse — nombres bruts, dates ISO 8601, `null` et jamais `undefined`.
 */

export type Jalons = {
  /** Réel : lu de `Quote.deposit_status`. */
  deposit_invoiced_at: string | null;
  /** Réel : lu de `Quote.deposit_status`. */
  deposit_paid_at: string | null;
  /** Simulé. */
  rib_sent_at: string | null;
  /** Simulé. */
  insurance_sent_at: string | null;
  /** Simulé. La date que le chantier attend. */
  worksite_date: string | null;
  /** Simulé. */
  materials_ordered_at: string | null;
  /** Simulé. Quand reprendre une affaire reportée. */
  resume_at: string | null;
};

export const EMPTY_JALONS: Jalons = {
  deposit_invoiced_at: null,
  deposit_paid_at: null,
  rib_sent_at: null,
  insurance_sent_at: null,
  worksite_date: null,
  materials_ordered_at: null,
  resume_at: null,
};

const DAY = 86_400_000;

/** Décalages du jeu de démonstration : positifs dans le passé, négatifs à venir. */
type SeedJalons = {
  ribSent?: number;
  insuranceSent?: number;
  worksite?: number;
  materials?: number;
  resume?: number;
};

/**
 * Le jeu de démonstration, clé par identifiant d'affaire.
 *
 * Il est volontairement **creux** : la plupart des affaires n'ont aucun jalon,
 * parce que la plupart n'ont pas dépassé le devis. Remplir tout le monde
 * donnerait un écran où rien n'alerte jamais, donc un écran qui ne sert à rien.
 */
const SEED: Record<string, SeedJalons> = {};

/**
 * Les jalons d'une affaire, à un instant donné.
 *
 * `overrides` porte ce que l'utilisateur coche pendant la session. Il prime sur
 * le jeu figé : cocher une case doit se voir, même en démonstration — sans
 * quoi l'écran donnerait le sentiment d'être cassé.
 */
export function readJalons(
  projectId: string,
  quotes: Quote[],
  overrides: Partial<Jalons> | undefined,
  now: number,
): Jalons {
  const seed = SEED[projectId] ?? {};
  const deposit = depositOf(quotes);

  // L'acompte est réel : on ne le simule pas, on le lit. Faute de date en
  // base, on l'ancre sur l'émission du devis — assez juste pour compter des
  // jours d'attente, et honnête puisque la colonne n'existe pas.
  const anchor = signedQuote(quotes)?.issued_at ?? null;

  const base: Jalons = {
    deposit_invoiced_at: deposit === "non_applicable" ? null : anchor,
    deposit_paid_at: deposit === "recu" ? anchor : null,
    rib_sent_at: iso(now, seed.ribSent),
    insurance_sent_at: iso(now, seed.insuranceSent),
    worksite_date: iso(now, seed.worksite),
    materials_ordered_at: iso(now, seed.materials),
    resume_at: iso(now, seed.resume),
  };

  return { ...base, ...stripUndefined(overrides) };
}

function depositOf(quotes: Quote[]): PaymentStatus {
  const signed = signedQuote(quotes);
  if (signed) return signed.deposit_status;
  return quotes[0]?.deposit_status ?? "non_applicable";
}

function signedQuote(quotes: Quote[]): Quote | null {
  return quotes.find((quote) => quote.status === "accepte" || quote.status === "realise") ?? null;
}

function iso(now: number, daysAgo: number | undefined): string | null {
  if (daysAgo === undefined) return null;
  return new Date(now - daysAgo * DAY).toISOString();
}

/**
 * Un `undefined` dans les surcharges veut dire « rien à dire », pas « efface ».
 * Sans ce filtre, décocher une case et recharger effacerait aussi ce que la
 * base sait de l'acompte.
 */
function stripUndefined(values: Partial<Jalons> | undefined): Partial<Jalons> {
  if (!values) return {};
  const out: Partial<Jalons> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) out[key as keyof Jalons] = value as string | null;
  }
  return out;
}

/** Les six jalons dans l'ordre du cycle, pour l'affichage. */
export const JALON_ORDER: Array<{
  key: keyof Jalons;
  label: string;
  hint: string;
  /** Vrai quand la base le sait déjà. Les autres portent la mention « simulé ». */
  real: boolean;
  /** Une date choisie, et non la date du jour. */
  picks: boolean;
}> = [
  {
    key: "deposit_invoiced_at",
    label: "Acompte facturé",
    hint: "La facture d'acompte est partie",
    real: true,
    picks: false,
  },
  {
    key: "rib_sent_at",
    label: "RIB envoyé",
    hint: "Coordonnées bancaires transmises au client",
    real: false,
    picks: false,
  },
  {
    key: "insurance_sent_at",
    label: "Assurance envoyée",
    hint: "Attestation décennale transmise",
    real: false,
    picks: false,
  },
  {
    key: "deposit_paid_at",
    label: "Acompte encaissé",
    hint: "Rien ne se commande avant",
    real: true,
    picks: false,
  },
  {
    key: "worksite_date",
    label: "Date de chantier",
    hint: "La date réservée au planning",
    real: false,
    picks: true,
  },
  {
    key: "materials_ordered_at",
    label: "Matériaux commandés",
    hint: "Béton, acier et fournitures",
    real: false,
    picks: false,
  },
];
