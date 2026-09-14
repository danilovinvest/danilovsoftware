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
  /** Du devis : combien. Nul quand on ne le connaît pas. */
  deposit_amount: string | null;
  /*
    Du devis : le solde est encaissé.

    Aucune colonne ne le date — le devis n'en porte que le statut — donc la
    date est celle de l'émission, faute de mieux, exactement comme pour un
    acompte d'avant les colonnes de dates. Ce qui compte ici est le franchi ;
    la date n'est qu'un ornement, et l'écran ne la promet pas.
  */
  balance_paid_at: string | null;
  rib_sent_at: string | null;
  insurance_sent_at: string | null;
  /** De l'affaire : `started_at`, la date réservée au planning. */
  worksite_date: string | null;
  materials_ordered_at: string | null;
  /**
   * Ce qui a été commandé.
   *
   * La date dit qu'on a commandé, la liste dit quoi. Les deux vivent dans la
   * même ligne parce qu'elles décrivent un fait unique : une commande sans
   * date n'existe pas, et une liste tenue ailleurs serait une seconde vérité
   * sur la même chose.
   */
  materials: string[];
  /** Quand reprendre une affaire reportée. */
  resume_at: string | null;
  /** De l'affaire côté études : les plans d'exécution envoyés au client. */
  plans_sent_at: string | null;
  /** L'avis client, demandé puis reçu. Les deux sociétés en recueillent. */
  review_requested_at: string | null;
  review_received_at: string | null;
  /**
   * Le procès-verbal de réception, envoyé puis signé. Il clôt un chantier et
   * débloque le solde. Posé depuis la fiche **ou** depuis l'événement de
   * chantier de l'agenda : deux chemins, une seule colonne.
   */
  pv_sent_at: string | null;
  pv_signed_at: string | null;
  /**
   * Les deux rapports du bureau d'études. Le rapport de visite est le premier
   * livrable, remis après le rendez-vous et avant de chiffrer ; celui de
   * sondage vient du sondage. Une affaire peut porter les deux.
   */
  visit_report_sent_at: string | null;
  survey_report_sent_at: string | null;
};

export const EMPTY_JALONS: Jalons = {
  deposit_invoiced_at: null,
  deposit_paid_at: null,
  deposit_amount: null,
  balance_paid_at: null,
  rib_sent_at: null,
  insurance_sent_at: null,
  worksite_date: null,
  materials_ordered_at: null,
  materials: [],
  resume_at: null,
  plans_sent_at: null,
  review_requested_at: null,
  review_received_at: null,
  pv_sent_at: null,
  pv_signed_at: null,
  visit_report_sent_at: null,
  survey_report_sent_at: null,
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
    deposit_amount: signed?.deposit_amount ?? null,
    balance_paid_at:
      signed && signed.balance_status === "recu" ? signed.issued_at : null,
    rib_sent_at: m?.rib_sent_at ?? null,
    insurance_sent_at: m?.insurance_sent_at ?? null,
    worksite_date: project?.started_at ?? null,
    materials_ordered_at: m?.materials_ordered_at ?? null,
    materials: m?.materials ?? [],
    resume_at: m?.resume_at ?? null,
    plans_sent_at: m?.plans_sent_at ?? null,
    pv_sent_at: m?.pv_sent_at ?? null,
    pv_signed_at: m?.pv_signed_at ?? null,
    visit_report_sent_at: m?.visit_report_sent_at ?? null,
    survey_report_sent_at: m?.survey_report_sent_at ?? null,
    review_requested_at: m?.review_requested_at ?? null,
    review_received_at: m?.review_received_at ?? null,
  };
}

/**
 * Les crans cochés à la main.
 *
 * Cinq crans du cycle ne sont datés par rien : le premier contact, le
 * rendez-vous, l'envoi du devis, la négociation, la signature. Ils se
 * *déduisaient* — d'un échange enregistré, d'un devis parti, d'un devis
 * accepté — et tant que la réalité suit cet ordre, la déduction suffit.
 *
 * Elle ne le suit pas toujours : un client signe sans qu'aucun rendez-vous
 * n'ait été saisi, une affaire reprise porte un devis qui vit dans un dossier
 * OneDrive et nulle part ailleurs. Le cran est franchi dans la vie, et l'écran
 * refusait de le dire faute de la pièce qui l'aurait prouvé.
 *
 * **Une marque n'est pas un jalon**, et c'est pourquoi elle a son propre type.
 * Un jalon est un fait daté que le CRM détient — le RIB est parti, les plans
 * sont envoyés. Une marque est ce qu'un humain affirme d'un cran, et elle
 * cohabite avec le fait sans le remplacer : un cran est franchi si le fait le
 * dit **ou** si la marque le dit, et retirer l'une ne retire pas l'autre.
 *
 * Les crans qui ont déjà un propriétaire n'en reçoivent pas : l'acompte et le
 * solde vivent sur le devis, la date de chantier sur l'affaire, les rapports et
 * l'avis dans les jalons. Leur donner une marque ferait deux vérités pour un
 * même fait.
 */
export type StepMarks = {
  contact_at: string | null;
  rdv_at: string | null;
  quote_sent_at: string | null;
  negotiation_at: string | null;
  signed_at: string | null;
};

export const EMPTY_MARKS: StepMarks = {
  contact_at: null,
  rdv_at: null,
  quote_sent_at: null,
  negotiation_at: null,
  signed_at: null,
};

/** Les marques d'une affaire, lues de ce que l'API a servi avec la fiche. */
export function readMarks(
  projectId: string,
  milestones: Milestones[] | undefined,
): StepMarks {
  const m = milestones?.find((entry) => entry.project_id === projectId);
  if (!m) return EMPTY_MARKS;
  return {
    contact_at: m.contact_at ?? null,
    rdv_at: m.rdv_at ?? null,
    quote_sent_at: m.quote_sent_at ?? null,
    negotiation_at: m.negotiation_at ?? null,
    signed_at: m.signed_at ?? null,
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
 * Les jalons d'après-signature, dans l'ordre du cycle et selon le métier.
 *
 * L'ordre n'est pas décoratif : rien ne se commande avant l'acompte encaissé,
 * et l'avis ne se demande qu'après le solde — « il faut la preuve que les sous
 * sont payés ». C'est en le voyant qu'on comprend pourquoi une affaire signée
 * depuis six semaines n'a toujours pas de date.
 *
 * Les deux métiers divergent après l'acompte : les travaux réservent une date
 * et commandent du béton, l'étude envoie ses plans d'exécution. Un bureau
 * d'études à qui l'on proposerait de cocher « matériaux commandés » douterait
 * du reste de l'écran.
 */
export type Jalon = {
  /*
    La clé est une **date**, jamais la liste des matériaux : celle-ci qualifie
    le jalon « matériaux commandés », elle n'en est pas un. Sans cette
    exclusion, chaque ligne de l'écran devrait se demander si elle affiche un
    instant ou un tableau.
  */
  key: Exclude<keyof Jalons, "materials" | "deposit_amount">;
  label: string;
  hint: string;
  /**
   * Ce que la ligne fait saisir, au lieu de cocher la date du jour.
   *
   * `"date"` — une date choisie au calendrier : un chantier se réserve pour
   * dans six semaines. `"materials"` — la liste de ce qui a été commandé, et
   * la date suit. `"deposit"` — le montant encaissé, qui se corrige ensuite.
   * `false` — une case, et c'est tout.
   */
  picks: false | "date" | "materials" | "deposit";
};

const ACOMPTE: Jalon[] = [
  {
    key: "deposit_invoiced_at",
    label: "Acompte facturé",
    hint: "La facture d'acompte est partie",
    picks: false,
  },
];

const FIN: Jalon[] = [
  {
    key: "review_requested_at",
    label: "Avis demandé",
    hint: "À demander une fois le solde encaissé, jamais avant",
    picks: false,
  },
  {
    key: "review_received_at",
    label: "Avis reçu",
    hint: "La parole du client, à reprendre dans une réalisation",
    picks: false,
  },
];

const TRAVAUX: Jalon[] = [
  ...ACOMPTE,
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
    picks: "deposit",
  },
  {
    key: "worksite_date",
    label: "Date de chantier",
    hint: "La date réservée au planning, partagée avec l'écran Chantiers",
    picks: "date",
  },
  {
    key: "materials_ordered_at",
    label: "Matériaux commandés",
    hint: "Béton, acier et fournitures",
    picks: "materials",
  },
  {
    key: "pv_sent_at",
    label: "PV envoyé",
    hint: "Le procès-verbal de réception transmis au client",
    picks: false,
  },
  {
    key: "pv_signed_at",
    label: "PV signé",
    hint: "Il clôt le chantier et débloque le solde",
    picks: false,
  },
  ...FIN,
];

const ETUDES: Jalon[] = [
  ...ACOMPTE,
  {
    key: "deposit_paid_at",
    label: "Acompte encaissé",
    hint: "L'étude démarre à l'encaissement",
    picks: "deposit",
  },
  {
    key: "visit_report_sent_at",
    label: "Rapport de visite",
    hint: "Le premier livrable, remis avant de chiffrer",
    picks: false,
  },
  {
    key: "survey_report_sent_at",
    label: "Rapport de sondage",
    hint: "Quand un sondage a été fait — distinct du rapport de visite",
    picks: false,
  },
  {
    key: "plans_sent_at",
    label: "Plans envoyés",
    hint: "Les plans d'exécution remis au client — le livrable attendu",
    picks: false,
  },
  ...FIN,
];

export function jalonOrder(metier: "etudes" | "travaux"): Jalon[] {
  return metier === "etudes" ? ETUDES : TRAVAUX;
}

/** Conservé pour ce qui ne distingue pas les métiers. */
export const JALON_ORDER = TRAVAUX;
