import type { Milestones, PaymentStatus, Project, Quote } from "./types";

/**
 * Les jalons d'après-signature d'une affaire.
 *
 * Le cycle du bureau d'études va plus loin que le devis : acompte facturé, RIB
 * envoyé, attestation d'assurance, attente du paiement, date de chantier
 * réservée, matériaux commandés.
 *
 * **Les six sont désormais en base.** Ils vivaient ici, en mémoire du
 * navigateur : cocher une case ne survivait pas au rechargement, et l'alerte
 * « aucune date de chantier » ne reposait sur rien. Ce module ne fait plus que
 * les assembler depuis trois sources, chacune propriétaire de ce qu'elle sait :
 *
 *   * le **devis** porte l'acompte — son statut et, depuis peu, ses dates ;
 *   * l'**affaire** porte la date de chantier, dans `started_at`. Réserver une
 *     date, c'est renseigner la colonne que l'écran Chantiers lit déjà ; lui
 *     en donner une seconde ferait diverger « signé sans date » d'un écran à
 *     l'autre au premier oubli ;
 *   * la table des **jalons** porte les quatre restants.
 *
 * Le module reste **pur** : ni React, ni réseau. Il prend ce que l'API a servi
 * et rend l'état du cycle.
 */

export type Jalons = {
  /** Du devis : la facture d'acompte est partie. */
  deposit_invoiced_at: string | null;
  /** Du devis : l'acompte est encaissé. */
  deposit_paid_at: string | null;
  rib_sent_at: string | null;
  insurance_sent_at: string | null;
  /** De l'affaire : `started_at`, la date réservée au planning. */
  worksite_date: string | null;
  materials_ordered_at: string | null;
  /** Quand reprendre une affaire reportée. */
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

/**
 * Les jalons d'une affaire, assemblés depuis ce que l'API a servi.
 *
 * `project` est facultatif : la liste des fiches n'a que des affaires
 * résumées, et le cycle s'y lit alors sans date de chantier. C'est le même
 * compromis assumé qu'ailleurs — la liste situe, la fiche détaille.
 */
export function readJalons(
  projectId: string,
  quotes: Quote[],
  milestones: Milestones[] | undefined,
  project?: { started_at: string | null } | Project,
): Jalons {
  const signed = signedQuote(quotes);
  const m = milestones?.find((entry) => entry.project_id === projectId);

  return {
    // Les dates de l'acompte viennent du devis. Faute de date sur un devis
    // ancien, le statut suffit à dire que le jalon est franchi : on retombe
    // alors sur la date d'émission, comme avant, mais seulement là.
    deposit_invoiced_at:
      signed && signed.deposit_status !== "non_applicable"
        ? (signed.deposit_invoiced_at ?? signed.issued_at)
        : null,
    deposit_paid_at:
      signed && signed.deposit_status === "recu"
        ? (signed.deposit_paid_at ?? signed.issued_at)
        : null,
    rib_sent_at: m?.rib_sent_at ?? null,
    insurance_sent_at: m?.insurance_sent_at ?? null,
    worksite_date: project?.started_at ?? null,
    materials_ordered_at: m?.materials_ordered_at ?? null,
    resume_at: m?.resume_at ?? null,
  };
}

function depositOf(quotes: Quote[]): PaymentStatus {
  const signed = signedQuote(quotes);
  if (signed) return signed.deposit_status;
  return quotes[0]?.deposit_status ?? "non_applicable";
}

function signedQuote(quotes: Quote[]): Quote | null {
  return (
    quotes.find((quote) => quote.status === "accepte" || quote.status === "realise") ??
    null
  );
}

export { depositOf };

/**
 * Les six jalons dans l'ordre du cycle.
 *
 * L'ordre n'est pas décoratif : rien ne se commande avant l'acompte encaissé,
 * et c'est en le voyant qu'on comprend pourquoi une affaire signée depuis six
 * semaines n'a toujours pas de date.
 */
export const JALON_ORDER: Array<{
  key: keyof Jalons;
  label: string;
  hint: string;
  /** Une date choisie au calendrier, et non la date du jour. */
  picks: boolean;
}> = [
  {
    key: "deposit_invoiced_at",
    label: "Acompte facturé",
    hint: "La facture d'acompte est partie",
    picks: false,
  },
  {
    key: "rib_sent_at",
    label: "RIB envoyé",
    hint: "Coordonnées bancaires transmises au client",
    picks: false,
  },
  {
    key: "insurance_sent_at",
    label: "Assurance envoyée",
    hint: "Attestation décennale transmise",
    picks: false,
  },
  {
    key: "deposit_paid_at",
    label: "Acompte encaissé",
    hint: "Rien ne se commande avant",
    picks: false,
  },
  {
    key: "worksite_date",
    label: "Date de chantier",
    hint: "La date réservée au planning",
    picks: true,
  },
  {
    key: "materials_ordered_at",
    label: "Matériaux commandés",
    hint: "Béton, acier et fournitures",
    picks: false,
  },
];
