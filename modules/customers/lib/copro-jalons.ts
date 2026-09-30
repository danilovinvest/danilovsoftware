import type { Jalon } from "./jalons";
import type { CoproValidations } from "./syndic-types";
import type { Milestones } from "./types";

/**
 * Les validations d'une copropriété (migration 109) : l'assemblée générale et
 * le vote des travaux, les fonds de l'assureur, le bon pour accord du syndic —
 * distinct de la signature de l'occupant — et le PV qu'il contresigne.
 *
 * Des jalons comme les autres, dans la même ligne et par la même route que
 * l'après-signature, sous le même éditeur de date. Ils ne s'affichent que pour
 * une affaire de copropriété, ou qu'un syndic ou un payeur tiers suit
 * (`coproApplies`) : un particulier n'a pas d'assemblée générale.
 *
 * Tous sont **facultatifs** : un sinistre fait intervenir l'assureur, une
 * étude n'a pas toujours besoin d'un vote. Aucun ne bloque la suite ni ne
 * réclame d'attention, là où un jalon obligatoire manquant se met en avant.
 */

export const EMPTY_COPRO: CoproValidations = {
  ag_at: null,
  works_voted_at: null,
  syndic_approval_at: null,
  insurance_funds_insurer: "",
  insurance_funds_amount: null,
  insurance_funds_received_at: null,
  pv_syndic_sent_at: null,
  pv_syndic_signed_at: null,
};

/** Les validations d'une affaire, lues de ses jalons. */
export function readCopro(m: Partial<Milestones> | undefined): CoproValidations {
  if (!m) return EMPTY_COPRO;
  return {
    ag_at: m.ag_at ?? null,
    works_voted_at: m.works_voted_at ?? null,
    syndic_approval_at: m.syndic_approval_at ?? null,
    insurance_funds_insurer: m.insurance_funds_insurer ?? "",
    insurance_funds_amount: m.insurance_funds_amount ?? null,
    insurance_funds_received_at: m.insurance_funds_received_at ?? null,
    pv_syndic_sent_at: m.pv_syndic_sent_at ?? null,
    pv_syndic_signed_at: m.pv_syndic_signed_at ?? null,
  };
}

/** Les validations, dans l'ordre où elles arrivent. */
export const COPRO_JALONS: Jalon[] = [
  {
    key: "ag_at",
    label: "Assemblée générale",
    hint: "L'AG qui examine les travaux — une date se réserve",
    picks: "date",
    optional: true,
  },
  {
    key: "works_voted_at",
    label: "Travaux votés",
    hint: "Le vote de l'AG, au procès-verbal d'assemblée",
    picks: false,
    optional: true,
  },
  {
    key: "insurance_funds_received_at",
    label: "Fonds d'assurance reçus",
    hint: "L'assureur et le montant attendus, puis le jour où ils arrivent",
    picks: "insurance",
    optional: true,
  },
  {
    key: "syndic_approval_at",
    label: "Bon pour accord du syndic",
    hint: "Distinct de la signature de l'occupant",
    picks: false,
    optional: true,
  },
  {
    key: "pv_syndic_sent_at",
    label: "PV transmis au syndic",
    hint: "Le procès-verbal de réception, à contresigner",
    picks: false,
    optional: true,
  },
  {
    key: "pv_syndic_signed_at",
    label: "PV contresigné par le syndic",
    hint: "Revenu signé : le syndic a réceptionné",
    picks: false,
    optional: true,
  },
];

/**
 * Faut-il montrer les validations d'une copropriété sur cette affaire ?
 *
 * Oui pour une fiche de copropriété, et pour toute affaire qu'un tiers suit —
 * un syndic sur la fiche, un payeur sur l'affaire : la SDC n'est pas toujours
 * rangée en copropriété, et c'est le syndic qui fait voter les travaux.
 */
export function coproApplies(
  customerKind: string,
  project: { payer_customer_id: string | null },
  hasSyndic: boolean,
): boolean {
  return customerKind === "copropriete" || project.payer_customer_id !== null || hasSyndic;
}
