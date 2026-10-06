import type { BillingRules, BuildingState, DunningStage, PortfolioPeriod } from "./syndic-types";

/**
 * Les libellés de l'espace syndic (migration 109), et les deux petites règles
 * d'écran qui vont avec. Pur : ni React ni réseau.
 */

/** Les marches du recouvrement, dans l'ordre où on les monte. */
export const DUNNING_ORDER: DunningStage[] = ["courriel", "lrar", "huissier", "assignation", "decision"];

export const DUNNING_STAGE: Record<DunningStage, { label: string; hint: string }> = {
  courriel: { label: "Relance par courriel", hint: "Le rappel simple, avec la facture" },
  lrar: { label: "Mise en demeure (LRAR)", hint: "La lettre recommandée, qui fait courir les délais" },
  huissier: { label: "Sommation d'huissier", hint: "Le commissaire de justice réclame le montant du jour" },
  assignation: { label: "Assignation", hint: "L'affaire est portée devant le tribunal" },
  decision: { label: "Décision de justice", hint: "Ordonnance ou jugement, favorable ou non" },
};

/**
 * La marche à proposer : celle qui suit la plus haute déjà montée. Une échelle
 * montée jusqu'en haut propose encore la décision — il y en a parfois deux.
 */
export function nextDunningStage(done: DunningStage[]): DunningStage {
  const highest = Math.max(-1, ...done.map((step) => DUNNING_ORDER.indexOf(step)));
  return DUNNING_ORDER[Math.min(highest + 1, DUNNING_ORDER.length - 1)];
}

export const BUILDING_STATE: Record<BuildingState, { label: string; tone: "success" | "info" | "neutral" }> = {
  gere: { label: "Géré", tone: "success" },
  herite: { label: "Hérité", tone: "info" },
  ancien: { label: "Ancien mandat", tone: "neutral" },
};

/** Les champs du circuit de facturation, dans l'ordre où on les remplit. */
export const BILLING_RULE_FIELDS: Array<{
  key: keyof BillingRules;
  label: string;
  placeholder: string;
  hint?: string;
}> = [
  {
    key: "billing_email",
    label: "Adresse de facturation",
    placeholder: "facturation@syndic.fr",
    hint: "Où envoyer les factures, quand ce n'est pas au gestionnaire.",
  },
  {
    key: "supplier_reference",
    label: "Référence fournisseur OMPT",
    placeholder: "F030300300000",
    hint: "Le numéro sous lequel ce tiers nous connaît, à porter sur la facture.",
  },
  { key: "portal_name", label: "Portail de validation", placeholder: "Nom du portail" },
  { key: "portal_url", label: "Adresse du portail", placeholder: "https://…" },
  { key: "portal_reference", label: "Référence sur le portail", placeholder: "7121447" },
  {
    key: "statement_label",
    label: "Libellé attendu sur le relevé",
    placeholder: "SDC MAROT",
    hint: "Ce que la banque écrit quand ce tiers paie : il servira au rapprochement.",
  },
];

/** Seuls les champs qui diffèrent : la route garde ceux qu'on ne lui envoie pas. */
export function changedRules(saved: BillingRules, draft: BillingRules): Partial<BillingRules> {
  const out: Partial<BillingRules> = {};
  for (const key of Object.keys(draft) as Array<keyof BillingRules>) {
    const value = draft[key].trim();
    if (value !== saved[key]) out[key] = value;
  }
  return out;
}

/** Des règles sans rien dedans : la carte le dit au lieu d'aligner sept tirets. */
export function rulesEmpty(rules: BillingRules): boolean {
  return Object.values(rules).every((value) => value === "");
}

/** « depuis mars 2021 », « de 2019 à 2023 », ou rien quand on ne sait pas. */
export function periodText(
  period: Pick<PortfolioPeriod, "started_at" | "ended_at">,
  format: (day: string | null) => string,
): string {
  const { started_at: from, ended_at: to } = period;
  if (from && to) return `du ${format(from)} au ${format(to)}`;
  if (to) return `jusqu'au ${format(to)}`;
  if (from) return `depuis le ${format(from)}`;
  return "";
}
