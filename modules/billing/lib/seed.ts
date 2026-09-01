import type { InvoiceKind } from "./types";

/**
 * Jeu de démonstration de la facturation.
 *
 * Les cinq **identités juridiques** sont réelles (voir `entities.ts`) ; tout ce
 * qui est facturé ici est inventé. Les clients sont volontairement les mêmes
 * que ceux du tableau de bord : les deux écrans racontent alors la même
 * activité, une affaire suivie d'un côté se retrouve facturée de l'autre.
 *
 * Les flux entre sociétés du groupe — loyers de la société civile, honoraires
 * de direction de la holding — sont une **hypothèse de montage**, pas une
 * information publique. Ils sont modélisés comme des factures ordinaires dont
 * le client se trouve être une autre entité : le panneau des flux internes en
 * est déduit, et la consolidation les élimine, exactement comme le ferait un
 * expert-comptable.
 */

export type SeedInvoice = {
  number: string;
  /** Société émettrice. */
  entity: string;
  customer: string;
  /** Renseigné si le client est une société du groupe. */
  customerEntity?: string;
  label: string;
  kind: InvoiceKind;
  /** Émise il y a N jours. */
  issued: number;
  /** Délai de paiement accordé, en jours. */
  terms: number;
  /** Montant hors taxes. Négatif pour un avoir. */
  ht: number;
  /** Taux de TVA : 20 % en règle générale, 10 % sur la rénovation de logements
      achevés depuis plus de deux ans. */
  vat: number;
  /** Montant déjà encaissé. */
  paid: number;
  draft?: boolean;
  credit?: boolean;
};

export const SEED_INVOICES: SeedInvoice[] = [
  // ---- OMPT STRUCTURE — le bureau d'études, celui que suit le CRM ---------
  { number: "F2025-063", entity: "ompt-structure", customer: "Cabinet Perrin Architectes", label: "Note de calcul béton armé — extension Cimiez", kind: "etude", issued: 380, terms: 30, ht: 7700, vat: 20, paid: 9240 },
  { number: "F2025-061", entity: "ompt-structure", customer: "Syndic Foncia Riviera", label: "Diagnostic fissures — immeuble Gambetta", kind: "etude", issued: 310, terms: 45, ht: 6200, vat: 20, paid: 7440 },
  { number: "F2025-052", entity: "ompt-structure", customer: "SCI Les Terrasses du Cap", label: "Reprise en sous-œuvre — étude villa Bellevue", kind: "etude", issued: 244, terms: 30, ht: 12000, vat: 20, paid: 14400 },
  { number: "F2026-041", entity: "ompt-structure", customer: "Cabinet Laurent & Associés", label: "Note de calcul — villa contemporaine Super-Cannes", kind: "etude", issued: 205, terms: 30, ht: 14000, vat: 20, paid: 16800 },
  { number: "F2026-070", entity: "ompt-structure", customer: "SAS Bâti Azur", label: "Renforcement plancher — local rue d'Antibes", kind: "etude", issued: 166, terms: 30, ht: 6700, vat: 20, paid: 8040 },
  // Avoir déjà imputé : le client a réglé F2026-070 net de cet avoir, donc il
  // ne pèse plus sur le solde. `paid` vaut son TTC — négatif comme lui — ce qui
  // ramène son reste dû à zéro et accorde l'encours et la balance âgée.
  { number: "AV2026-004", entity: "ompt-structure", customer: "SAS Bâti Azur", label: "Avoir sur F2026-070 — erreur de métré", kind: "etude", issued: 150, terms: 0, ht: -900, vat: 20, paid: -1080, credit: true },
  { number: "F2026-078", entity: "ompt-structure", customer: "Mme Sanchez", label: "Ouverture de mur porteur — appartement front de mer", kind: "etude", issued: 128, terms: 30, ht: 3250, vat: 20, paid: 3900 },
  { number: "F2026-069", entity: "ompt-structure", customer: "Syndic Foncia Riviera", label: "Sondages de fondations — résidence Le Ponant (acompte)", kind: "sondages", issued: 96, terms: 45, ht: 5800, vat: 20, paid: 2000 },
  { number: "F2026-075", entity: "ompt-structure", customer: "Promotion Littoral SAS", label: "Pré-étude de faisabilité — résidence 24 logements", kind: "etude", issued: 62, terms: 45, ht: 3400, vat: 20, paid: 0 },
  { number: "F2026-084", entity: "ompt-structure", customer: "Cabinet Laurent & Associés", label: "Étude complémentaire — piscine sur pilotis", kind: "etude", issued: 44, terms: 30, ht: 8580, vat: 20, paid: 10296 },
  { number: "F2026-086", entity: "ompt-structure", customer: "OMPT GROUPE", customerEntity: "ompt-groupe", label: "Étude d'exécution — chantier Saint-Roch", kind: "refacturation", issued: 40, terms: 30, ht: 5200, vat: 20, paid: 6240 },
  { number: "F2026-088", entity: "ompt-structure", customer: "Cabinet Perrin Architectes", label: "Charpente bois — combles aménageables", kind: "etude", issued: 19, terms: 30, ht: 9790, vat: 20, paid: 0 },
  { number: "F2026-092", entity: "ompt-structure", customer: "Syndic Citya Côte d'Azur", label: "Reprise de balcons — Saint-Roch (acompte 40 %)", kind: "etude", issued: 26, terms: 30, ht: 7160, vat: 20, paid: 0 },
  { number: "F2026-091", entity: "ompt-structure", customer: "Atelier d'architecture Moreau", label: "Étude de structure — piscine à débordement (acompte)", kind: "etude", issued: 11, terms: 30, ht: 4130, vat: 20, paid: 0 },
  { number: "F2026-093", entity: "ompt-structure", customer: "Hôtel Belle Rive", label: "Étude préalable — création de spa en sous-sol", kind: "etude", issued: 3, terms: 30, ht: 2400, vat: 20, paid: 0, draft: true },

  // ---- OMPT GROUPE — les travaux ------------------------------------------
  { number: "F2025-T088", entity: "ompt-groupe", customer: "Résidence Le Ponant", label: "Mise en sécurité — garde-corps", kind: "travaux", issued: 190, terms: 45, ht: 12300, vat: 10, paid: 13530 },
  { number: "F2026-T097", entity: "ompt-groupe", customer: "M. et Mme Ferrand", label: "Ouverture de mur porteur — villa Les Cyprès", kind: "travaux", issued: 141, terms: 30, ht: 9400, vat: 10, paid: 0 },
  { number: "F2026-T104", entity: "ompt-groupe", customer: "Copropriété Les Oliviers", label: "Reprise d'enduits — bâtiment B", kind: "travaux", issued: 118, terms: 45, ht: 31500, vat: 10, paid: 34650 },
  { number: "F2026-T112", entity: "ompt-groupe", customer: "SCI Les Terrasses du Cap", label: "Reprise en sous-œuvre — villa Bellevue, tranche 1", kind: "travaux", issued: 74, terms: 45, ht: 24100, vat: 10, paid: 26510 },
  { number: "F2026-T118", entity: "ompt-groupe", customer: "SCI Les Terrasses du Cap", label: "Reprise en sous-œuvre — tranche 2", kind: "travaux", issued: 32, terms: 45, ht: 18600, vat: 10, paid: 0 },
  { number: "F2026-T121", entity: "ompt-groupe", customer: "Hôtel Belle Rive", label: "Climatisation — 12 chambres et espaces communs", kind: "travaux", issued: 21, terms: 30, ht: 42800, vat: 20, paid: 15000 },
  { number: "F2026-T124", entity: "ompt-groupe", customer: "Syndic Citya Côte d'Azur", label: "Reprise de balcons — phase 1", kind: "travaux", issued: 8, terms: 45, ht: 57200, vat: 10, paid: 0 },
  { number: "F2026-T126", entity: "ompt-groupe", customer: "Mme Ferrari", label: "Pose de spa sur terrasse — reprise de dalle", kind: "travaux", issued: 2, terms: 30, ht: 6900, vat: 10, paid: 0, draft: true },

  // ---- AVENUE DE GRASSE — l'agence immobilière ----------------------------
  { number: "F2026-AG012", entity: "avenue-de-grasse", customer: "M. Ravel", label: "Commission — vente villa Menton", kind: "commission", issued: 120, terms: 15, ht: 21400, vat: 20, paid: 25680 },
  { number: "F2026-AG018", entity: "avenue-de-grasse", customer: "M. et Mme Nguyen", label: "Commission — vente appartement Cannes centre", kind: "commission", issued: 57, terms: 15, ht: 18000, vat: 20, paid: 21600 },
  { number: "F2026-AG021", entity: "avenue-de-grasse", customer: "SCI Mimosa", label: "Commission — vente terrain en restanques, Grasse", kind: "commission", issued: 29, terms: 15, ht: 26500, vat: 20, paid: 0 },
  { number: "F2026-AG023", entity: "avenue-de-grasse", customer: "Promotion Littoral SAS", label: "Mandat de commercialisation — acompte", kind: "commission", issued: 12, terms: 30, ht: 9000, vat: 20, paid: 0 },

  // ---- DANILOV FONCIÈRE — les loyers, tous internes -----------------------
  { number: "F2026-L038", entity: "danilov-fonciere", customer: "AVENUE DE GRASSE", customerEntity: "avenue-de-grasse", label: "Loyer T2 2026 — bureau rez-de-chaussée", kind: "loyer", issued: 96, terms: 30, ht: 2400, vat: 20, paid: 2880 },
  { number: "F2026-L041", entity: "danilov-fonciere", customer: "OMPT STRUCTURE", customerEntity: "ompt-structure", label: "Loyer T2 2026 — 25 avenue de Grasse", kind: "loyer", issued: 96, terms: 30, ht: 7200, vat: 20, paid: 8640 },
  { number: "F2026-L042", entity: "danilov-fonciere", customer: "OMPT GROUPE", customerEntity: "ompt-groupe", label: "Loyer T2 2026 — atelier et dépôt", kind: "loyer", issued: 96, terms: 30, ht: 5400, vat: 20, paid: 6480 },
  { number: "F2026-L045", entity: "danilov-fonciere", customer: "OMPT STRUCTURE", customerEntity: "ompt-structure", label: "Loyer T3 2026 — 25 avenue de Grasse", kind: "loyer", issued: 6, terms: 30, ht: 7200, vat: 20, paid: 0 },
  { number: "F2026-L046", entity: "danilov-fonciere", customer: "OMPT GROUPE", customerEntity: "ompt-groupe", label: "Loyer T3 2026 — atelier et dépôt", kind: "loyer", issued: 6, terms: 30, ht: 5400, vat: 20, paid: 0 },

  // ---- DANILOV INVEST — la holding, honoraires de direction ---------------
  { number: "F2026-H027", entity: "danilov-invest", customer: "OMPT STRUCTURE", customerEntity: "ompt-structure", label: "Honoraires de direction T2 2026", kind: "honoraires", issued: 92, terms: 30, ht: 12000, vat: 20, paid: 14400 },
  { number: "F2026-H028", entity: "danilov-invest", customer: "OMPT GROUPE", customerEntity: "ompt-groupe", label: "Honoraires de direction T2 2026", kind: "honoraires", issued: 92, terms: 30, ht: 9000, vat: 20, paid: 10800 },
  { number: "F2026-H029", entity: "danilov-invest", customer: "AVENUE DE GRASSE", customerEntity: "avenue-de-grasse", label: "Honoraires de direction T2 2026", kind: "honoraires", issued: 92, terms: 30, ht: 4500, vat: 20, paid: 5400 },
  { number: "F2026-H031", entity: "danilov-invest", customer: "OMPT STRUCTURE", customerEntity: "ompt-structure", label: "Honoraires de direction T3 2026", kind: "honoraires", issued: 4, terms: 30, ht: 12000, vat: 20, paid: 0 },
  { number: "F2026-H032", entity: "danilov-invest", customer: "OMPT GROUPE", customerEntity: "ompt-groupe", label: "Honoraires de direction T3 2026", kind: "honoraires", issued: 4, terms: 30, ht: 9000, vat: 20, paid: 0 },
];

/**
 * Régime de TVA déclaré par société. Le réel régime dépend du chiffre
 * d'affaires et d'options que le registre ne publie pas : c'est une hypothèse.
 */
export const SEED_VAT_REGIME: Record<string, "mensuel" | "trimestriel"> = {
  "danilov-invest": "trimestriel",
  "ompt-structure": "mensuel",
  "ompt-groupe": "mensuel",
  "avenue-de-grasse": "trimestriel",
  "danilov-fonciere": "trimestriel",
};
