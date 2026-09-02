import type { BlockedReason, CostKind, StudyStatus } from "./types";

/**
 * Jeu de démonstration des chantiers.
 *
 * Les clients sont ceux de l'export de devis réel : le tableau de bord, la
 * facturation et cet écran parlent des mêmes affaires. Les montants, les
 * coûts et les jalons sont inventés — le CRM n'a jamais suivi cette partie du
 * métier, il n'existe donc aucune donnée à reprendre.
 *
 * Les dates sont des décalages en jours : positif dans le passé, **négatif
 * dans le futur**. L'écran ne vieillit pas.
 */

type SeedCost = {
  kind: CostKind;
  label: string;
  supplier: string;
  ht: number;
  /** Payé il y a N jours ; absent = non réglé. */
  paid?: number;
};

type SeedPayment = {
  ttc: number;
  invoiced?: number;
  due?: number;
  paid?: number;
  reminded?: number;
};

export type SeedWorksite = {
  id: string;
  ref: string;
  label: string;
  customer: string;
  customerId: string;
  /** Vrai quand le client est une société du groupe (autoliquidation). */
  internal?: boolean;
  city: string;
  address: string;
  owner: string;
  activity: string;
  signed: number;
  starts?: number;
  ends?: number;
  completed?: number;
  blocked?: BlockedReason;
  study?: StudyStatus;
  ht: number;
  vat: number;
  costs?: SeedCost[];
  deposit?: SeedPayment;
  balance?: SeedPayment;
  pvSent?: number;
  pvSigned?: number;
  reviewAsked?: number;
  reviewGot?: number;
  quotes: Array<{
    ref: string;
    label: string;
    activity: string;
    ht: number;
    vat: number;
    signed?: number;
  }>;
};

export const SEED_WORKSITES: SeedWorksite[] = [
  // ---- Clôturés ------------------------------------------------------------
  {
    id: "w-01",
    ref: "CH-2026-014",
    label: "Ouverture de mur porteur — appartement front de mer",
    customer: "Mme Sanchez",
    customerId: "c-sanchez",
    city: "Cagnes-sur-Mer",
    address: "12 promenade de la Plage",
    owner: "Yanis Bouhali",
    activity: "gros-oeuvre",
    signed: 150,
    starts: 128,
    ends: 110,
    completed: 108,
    ht: 18400,
    vat: 10,
    costs: [
      { kind: "sous_traitance", label: "Étaiement et démolition", supplier: "SARL Bertoni", ht: 5200, paid: 96 },
      { kind: "materiaux", label: "Poutre IPE 240 + platines", supplier: "Descours & Cabaud", ht: 3850, paid: 120 },
    ],
    deposit: { ttc: 8096, invoiced: 145, due: 130, paid: 132 },
    balance: { ttc: 12144, invoiced: 105, due: 75, paid: 78 },
    pvSent: 107,
    pvSigned: 101,
    reviewAsked: 99,
    reviewGot: 92,
    quotes: [
      { ref: "DE2026-0078", label: "Étude de structure", activity: "etudes", ht: 3250, vat: 20, signed: 155 },
      { ref: "DE2026-0079", label: "Travaux d'ouverture", activity: "gros-oeuvre", ht: 18400, vat: 10, signed: 150 },
    ],
  },
  {
    id: "w-02",
    ref: "CH-2026-021",
    label: "Renforcement plancher — local commercial rue d'Antibes",
    customer: "SAS Bâti Azur",
    customerId: "c-bati-azur",
    city: "Cannes",
    address: "45 rue d'Antibes",
    owner: "Léa Vidal",
    activity: "gros-oeuvre",
    signed: 132,
    starts: 118,
    ends: 96,
    completed: 94,
    ht: 31500,
    vat: 10,
    costs: [
      { kind: "sous_traitance", label: "Pose de la structure métallique", supplier: "Métallerie Riviera", ht: 11800, paid: 82 },
      { kind: "materiaux", label: "Profilés, connecteurs, dalle collaborante", supplier: "Point.P", ht: 7400, paid: 100 },
      { kind: "autre", label: "Location nacelle 5 jours", supplier: "Kiloutou", ht: 980, paid: 100 },
    ],
    deposit: { ttc: 13860, invoiced: 130, due: 115, paid: 116 },
    balance: { ttc: 20790, invoiced: 92, due: 62, paid: 59 },
    pvSent: 93,
    pvSigned: 88,
    reviewAsked: 85,
    reviewGot: 80,
    quotes: [
      { ref: "DE2025-0141", label: "Étude de renforcement", activity: "etudes", ht: 6700, vat: 20, signed: 140 },
      { ref: "DE2026-T021", label: "Travaux de renforcement", activity: "gros-oeuvre", ht: 31500, vat: 10, signed: 132 },
    ],
  },
  {
    id: "w-03",
    ref: "CH-2026-009",
    label: "Reprise en sous-œuvre — villa Bellevue, tranche 1",
    customer: "SCI Les Terrasses du Cap",
    customerId: "c-terrasses",
    city: "Roquebrune-Cap-Martin",
    address: "8 avenue Bellevue",
    owner: "Léa Vidal",
    activity: "gros-oeuvre",
    signed: 190,
    starts: 172,
    ends: 140,
    completed: 138,
    ht: 62400,
    vat: 10,
    costs: [
      { kind: "sous_traitance", label: "Micropieux et reprise de fondations", supplier: "Soltech Provence", ht: 24500, paid: 130 },
      { kind: "materiaux", label: "Béton, aciers, coffrage", supplier: "Lafarge", ht: 12900, paid: 145 },
    ],
    deposit: { ttc: 27456, invoiced: 188, due: 173, paid: 174 },
    balance: { ttc: 41184, invoiced: 136, due: 106, paid: 103 },
    pvSent: 137,
    pvSigned: 130,
    reviewAsked: 128,
    quotes: [
      { ref: "DE2025-0118", label: "Étude de reprise en sous-œuvre", activity: "etudes", ht: 14400, vat: 20, signed: 200 },
      { ref: "DE2026-T009", label: "Travaux tranche 1", activity: "gros-oeuvre", ht: 62400, vat: 10, signed: 190 },
    ],
  },
  {
    id: "w-04",
    ref: "ET-2026-031",
    label: "Note de calcul — villa contemporaine Super-Cannes",
    customer: "Cabinet Laurent & Associés",
    customerId: "c-laurent",
    city: "Cannes",
    address: "Boulevard de Super-Cannes",
    owner: "Alexandre Danilov",
    activity: "etudes",
    signed: 205,
    starts: 200,
    ends: 170,
    completed: 168,
    study: "termine",
    ht: 16800,
    vat: 20,
    costs: [
      { kind: "sous_traitance", label: "Sondages destructifs", supplier: "Géotec Sud", ht: 2400, paid: 180 },
    ],
    deposit: { ttc: 8064, invoiced: 203, due: 188, paid: 190 },
    balance: { ttc: 12096, invoiced: 166, due: 136, paid: 134 },
    quotes: [
      { ref: "DE2025-0127", label: "Note de calcul structure", activity: "etudes", ht: 16800, vat: 20, signed: 205 },
    ],
  },

  // ---- En réception : travaux finis, PV en cours ---------------------------
  {
    id: "w-05",
    ref: "CH-2026-033",
    label: "Reprise d'enduits et balcons — bâtiment B",
    customer: "Copropriété Les Oliviers",
    customerId: "c-oliviers",
    city: "Le Cannet",
    address: "24 chemin des Oliviers",
    owner: "Marc Fabre",
    activity: "gros-oeuvre",
    signed: 96,
    starts: 74,
    ends: 32,
    completed: 30,
    ht: 48200,
    vat: 10,
    costs: [
      { kind: "sous_traitance", label: "Échafaudage et ravalement", supplier: "Azur Façades", ht: 18600, paid: 22 },
      { kind: "materiaux", label: "Enduit, mortier de réparation", supplier: "Point.P", ht: 6300, paid: 40 },
    ],
    deposit: { ttc: 21208, invoiced: 94, due: 79, paid: 80 },
    balance: { ttc: 31812, invoiced: 28, due: 0, reminded: 6 },
    pvSent: 29,
    quotes: [
      { ref: "DE2026-T033", label: "Travaux de reprise", activity: "gros-oeuvre", ht: 48200, vat: 10, signed: 96 },
    ],
  },
  {
    id: "w-06",
    ref: "CH-2026-041",
    label: "Climatisation 12 chambres et espaces communs",
    customer: "Hôtel Belle Rive",
    customerId: "c-belle-rive",
    city: "Beaulieu-sur-Mer",
    address: "3 boulevard Maréchal Leclerc",
    owner: "Marc Fabre",
    activity: "clim-epdm",
    signed: 62,
    starts: 45,
    ends: 12,
    completed: 10,
    ht: 42800,
    vat: 20,
    costs: [
      { kind: "materiaux", label: "Groupes extérieurs et splits Daikin", supplier: "CGED", ht: 19400, paid: 30 },
      { kind: "sous_traitance", label: "Électricité et raccordements", supplier: "Elec Riviera", ht: 6800 },
    ],
    deposit: { ttc: 20544, invoiced: 60, due: 45, paid: 44 },
    balance: { ttc: 30816, invoiced: 8, due: -22 },
    pvSent: 9,
    pvSigned: 4,
    quotes: [
      { ref: "DE2026-C041", label: "Climatisation réversible", activity: "clim-epdm", ht: 42800, vat: 20, signed: 62 },
    ],
  },
  {
    id: "w-07",
    ref: "CH-2026-038",
    label: "Étanchéité EPDM — toiture-terrasse",
    customer: "SDC Résidence Saint-Roch",
    customerId: "c-sdc",
    city: "Nice",
    address: "17 rue Saint-Roch",
    owner: "Marc Fabre",
    activity: "clim-epdm",
    signed: 78,
    starts: 52,
    ends: 20,
    completed: 24,
    ht: 27600,
    vat: 10,
    costs: [
      { kind: "materiaux", label: "Membrane EPDM et isolant", supplier: "Soprema", ht: 11200, paid: 34 },
      { kind: "sous_traitance", label: "Étanchéité — pose", supplier: "Étanchéité Var", ht: 7400, paid: 12 },
    ],
    deposit: { ttc: 12144, invoiced: 76, due: 61, paid: 63 },
    balance: { ttc: 18216, invoiced: 22, due: -8 },
    pvSent: 23,
    quotes: [
      { ref: "DE2026-E038", label: "Réfection d'étanchéité", activity: "clim-epdm", ht: 27600, vat: 10, signed: 78 },
    ],
  },

  // ---- En cours ------------------------------------------------------------
  {
    id: "w-08",
    ref: "CH-2026-052",
    label: "Modification du poolhouse — abaissement de plancher et surélévation",
    customer: "Ahmed Kazzaz",
    customerId: "c-kazzaz",
    city: "Vallauris",
    address: "Chemin des Anges",
    owner: "Alexandre Danilov",
    activity: "gros-oeuvre",
    signed: 34,
    starts: 21,
    ends: -18,
    ht: 100195,
    vat: 20,
    costs: [
      { kind: "sous_traitance", label: "Terrassement et démolition", supplier: "TP Azur", ht: 21400, paid: 6 },
      { kind: "materiaux", label: "Béton armé, coffrage, aciers", supplier: "Lafarge", ht: 18700 },
      { kind: "sous_traitance", label: "Charpente métallique", supplier: "Métallerie Riviera", ht: 14200 },
    ],
    deposit: { ttc: 48094, invoiced: 32, due: 17, paid: 15 },
    balance: { ttc: 72140 },
    quotes: [
      { ref: "DE2026-0135", label: "Étude de structure du poolhouse", activity: "etudes", ht: 12400, vat: 20, signed: 40 },
      { ref: "DE2026-T052", label: "Travaux poolhouse", activity: "gros-oeuvre", ht: 100195, vat: 20, signed: 34 },
    ],
  },
  {
    id: "w-09",
    ref: "CH-2026-055",
    label: "Rénovation d'un appartement — 67 bd de la Croisette",
    customer: "David Haziza",
    customerId: "c-haziza",
    city: "Cannes",
    address: "67 boulevard de la Croisette",
    owner: "Alexandre Danilov",
    activity: "gros-oeuvre",
    signed: 28,
    starts: 14,
    ends: -32,
    ht: 83035,
    vat: 10,
    costs: [
      { kind: "sous_traitance", label: "Lot démolition", supplier: "SARL Bertoni", ht: 11105, paid: 3 },
      { kind: "sous_traitance", label: "Lot électricité", supplier: "Elec Riviera", ht: 23380 },
      { kind: "materiaux", label: "Cloisons, plâtrerie, second œuvre", supplier: "Point.P", ht: 9800 },
    ],
    deposit: { ttc: 36536, invoiced: 26, due: 11, paid: 9 },
    balance: { ttc: 54803 },
    quotes: [
      { ref: "DE2026-0139", label: "Lot démolition", activity: "gros-oeuvre", ht: 11105, vat: 10, signed: 28 },
      { ref: "DE2026-0140", label: "Lot électricité", activity: "gros-oeuvre", ht: 23380, vat: 10, signed: 28 },
      { ref: "DE2026-0097", label: "Rénovation complète", activity: "gros-oeuvre", ht: 83035, vat: 10, signed: 28 },
    ],
  },
  {
    id: "w-10",
    ref: "CH-2026-058",
    label: "Renforcement de plancher sur quatre niveaux",
    customer: "Svetlana Anisimova",
    customerId: "c-anisimova",
    city: "Cannes",
    address: "9 rue Buttura",
    owner: "Léa Vidal",
    activity: "gros-oeuvre",
    signed: 20,
    starts: 8,
    ends: -40,
    ht: 121886,
    vat: 10,
    costs: [
      { kind: "sous_traitance", label: "Structure métallique — fourniture et pose", supplier: "Métallerie Riviera", ht: 44200 },
      { kind: "materiaux", label: "Dalle collaborante et connecteurs", supplier: "Descours & Cabaud", ht: 21600 },
    ],
    deposit: { ttc: 53630, invoiced: 18, due: 3, reminded: 2 },
    balance: { ttc: 80445 },
    quotes: [
      { ref: "DE2026-0116", label: "Renforcement de plancher", activity: "gros-oeuvre", ht: 121886, vat: 10, signed: 20 },
    ],
  },
  {
    id: "w-11",
    ref: "ET-2026-061",
    label: "Réhabilitation et extension — construction d'un garage",
    customer: "JOVANOVIC",
    customerId: "c-jovanovic",
    city: "Mougins",
    address: "Chemin de la Plaine",
    owner: "Alexandre Danilov",
    activity: "etudes",
    signed: 26,
    starts: 19,
    ends: -12,
    study: "en_cours",
    ht: 42513,
    vat: 20,
    costs: [
      { kind: "sous_traitance", label: "Étude géotechnique G2", supplier: "Géotec Sud", ht: 6800, paid: 4 },
    ],
    deposit: { ttc: 20406, invoiced: 24, due: 9, paid: 7 },
    balance: { ttc: 30609 },
    quotes: [
      { ref: "DE2026-0054", label: "Étude de réhabilitation", activity: "etudes", ht: 42513, vat: 20, signed: 26 },
    ],
  },
  {
    id: "w-12",
    ref: "CH-2026-064",
    label: "Sondages structurels et étaiement",
    customer: "OMPT GROUPE",
    customerId: "c-305938",
    internal: true,
    city: "Cannes",
    address: "25 avenue de Grasse",
    owner: "Léa Vidal",
    activity: "etudes",
    signed: 16,
    starts: 9,
    ends: -6,
    study: "en_cours",
    ht: 15000,
    vat: 0,
    deposit: { ttc: 15000, invoiced: 14, due: -1 },
    quotes: [
      { ref: "DE2026-0011", label: "Sous-traitance — sondages", activity: "etudes", ht: 15000, vat: 0, signed: 16 },
    ],
  },

  // ---- En attente ----------------------------------------------------------
  {
    id: "w-13",
    ref: "CH-2026-049",
    label: "Reprise de balcons — résidence Saint-Roch",
    customer: "Syndic Citya Côte d'Azur",
    customerId: "c-citya",
    city: "Nice",
    address: "17 rue Saint-Roch",
    owner: "Marc Fabre",
    activity: "gros-oeuvre",
    signed: 44,
    starts: 30,
    ends: -4,
    blocked: "tiers",
    ht: 57200,
    vat: 10,
    costs: [
      { kind: "sous_traitance", label: "Échafaudage", supplier: "Azur Façades", ht: 9200, paid: 12 },
    ],
    deposit: { ttc: 25168, invoiced: 42, due: 27, paid: 25 },
    balance: { ttc: 37752 },
    quotes: [
      { ref: "DE2026-0034", label: "Étude de reprise de balcons", activity: "etudes", ht: 21500, vat: 20, signed: 50 },
      { ref: "DE2026-T049", label: "Travaux de reprise", activity: "gros-oeuvre", ht: 57200, vat: 10, signed: 44 },
    ],
  },
  {
    id: "w-14",
    ref: "ET-2026-066",
    label: "Démolition de cloisons semi-porteuses — 20 avenue Gubernatis",
    customer: "Mme Paillat (architecte)",
    customerId: "c-paillat",
    city: "Nice",
    address: "20 avenue Gubernatis",
    owner: "Alexandre Danilov",
    activity: "etudes",
    signed: 38,
    starts: 30,
    blocked: "elements",
    study: "en_attente_elements",
    ht: 9437,
    vat: 20,
    deposit: { ttc: 5662, invoiced: 36, due: 21, paid: 19 },
    balance: { ttc: 5662 },
    quotes: [
      { ref: "DE2026-0094", label: "Étude de démolition", activity: "etudes", ht: 9437, vat: 20, signed: 38 },
    ],
  },
  {
    id: "w-15",
    ref: "ET-2026-070",
    label: "Mur de soutènement en copropriété",
    customer: "Murielle Mirval",
    customerId: "c-mirval",
    city: "Villeneuve-Loubet",
    address: "Chemin des Vespins",
    owner: "Yanis Bouhali",
    activity: "etudes",
    signed: 30,
    starts: 24,
    blocked: "sondages",
    study: "en_attente_sondages",
    ht: 7800,
    vat: 20,
    costs: [
      { kind: "sous_traitance", label: "Mission géotechnique G2 AVP", supplier: "Géotec Sud", ht: 3900 },
    ],
    deposit: { ttc: 4680, invoiced: 28, due: 13, reminded: 5 },
    quotes: [
      { ref: "DE2026-0070", label: "Étude de soutènement", activity: "etudes", ht: 7800, vat: 20, signed: 30 },
    ],
  },

  // ---- Planifiés (démarrage à venir) --------------------------------------
  {
    id: "w-16",
    ref: "CH-2026-072",
    label: "Surélévation R+1 — maison de ville Le Suquet",
    customer: "SAS Bâti Azur",
    customerId: "c-bati-azur",
    city: "Cannes",
    address: "6 rue du Suquet",
    owner: "Léa Vidal",
    activity: "gros-oeuvre",
    signed: 12,
    starts: -9,
    ends: -58,
    ht: 64300,
    vat: 10,
    costs: [
      { kind: "materiaux", label: "Charpente et couverture", supplier: "Point.P", ht: 17800 },
    ],
    deposit: { ttc: 28292, invoiced: 10, due: -5 },
    quotes: [
      { ref: "DE2026-0039", label: "Étude de surélévation", activity: "etudes", ht: 16200, vat: 20, signed: 18 },
      { ref: "DE2026-T072", label: "Travaux de surélévation", activity: "gros-oeuvre", ht: 64300, vat: 10, signed: 12 },
    ],
  },
  {
    id: "w-17",
    ref: "CH-2026-074",
    label: "Création d'une trémie d'escalier",
    customer: "THEUWISSEN",
    customerId: "c-theuwissen",
    city: "Antibes",
    address: "5 avenue de Provence",
    owner: "Yanis Bouhali",
    activity: "gros-oeuvre",
    signed: 8,
    starts: -14,
    ends: -30,
    ht: 21786,
    vat: 10,
    quotes: [
      { ref: "DE2026-0055", label: "Trémie S1", activity: "gros-oeuvre", ht: 10716, vat: 10, signed: 8 },
      { ref: "DE2026-0056", label: "Trémie S2", activity: "gros-oeuvre", ht: 11070, vat: 10, signed: 8 },
    ],
  },
  {
    id: "w-18",
    ref: "CH-2026-076",
    label: "Confortement du plancher haut des caves",
    customer: "Citya Nice Immobilière",
    customerId: "c-citya-nice",
    city: "Nice",
    address: "3 rue Gubernatis",
    owner: "Marc Fabre",
    activity: "travaux-nice",
    signed: 6,
    starts: -21,
    ends: -49,
    ht: 13907,
    vat: 20,
    quotes: [
      { ref: "DE2024-0233", label: "Confortement PH des caves", activity: "travaux-nice", ht: 13907, vat: 20, signed: 6 },
    ],
  },

  // ---- À planifier (signés, sans date) ------------------------------------
  {
    id: "w-19",
    ref: "CH-2026-078",
    label: "Reprise et renforcement structurel",
    customer: "Baud",
    customerId: "c-baud",
    city: "Beaulieu-sur-Mer",
    address: "Avenue Blundell Maple",
    owner: "Alexandre Danilov",
    activity: "gros-oeuvre",
    signed: 5,
    ht: 20590,
    vat: 20,
    quotes: [
      { ref: "DE2026-0138", label: "Travaux de reprise", activity: "gros-oeuvre", ht: 20590, vat: 20, signed: 5 },
    ],
  },
  {
    id: "w-20",
    ref: "CH-2026-079",
    label: "Renforcement des fondations suite au terrassement",
    customer: "Laurent",
    customerId: "c-laurent-2",
    city: "Grasse",
    address: "Route de Cannes",
    owner: "Léa Vidal",
    activity: "gros-oeuvre",
    signed: 3,
    ht: 79568,
    vat: 10,
    quotes: [
      { ref: "DE2026-0028", label: "Renforcement de fondations", activity: "gros-oeuvre", ht: 79568, vat: 10, signed: 3 },
      { ref: "DE2026-0029", label: "Suppression de piliers en sous-sol", activity: "gros-oeuvre", ht: 39767, vat: 10 },
    ],
  },
  {
    id: "w-21",
    ref: "CH-2026-081",
    label: "Climatisation — villa individuelle",
    customer: "Florence MITHAT",
    customerId: "c-mithat",
    city: "Le Cannet",
    address: "Chemin du Colombier",
    owner: "Marc Fabre",
    activity: "clim-epdm",
    signed: 2,
    ht: 18900,
    vat: 10,
    quotes: [
      { ref: "DE2026-C081", label: "Climatisation gainable", activity: "clim-epdm", ht: 18900, vat: 10, signed: 2 },
    ],
  },
  {
    id: "w-22",
    ref: "ET-2026-083",
    label: "Plans d'exécution — extension et garage",
    customer: "Le Faucheur",
    customerId: "c-faucheur",
    city: "Mougins",
    address: "Chemin de Font-Neuve",
    owner: "Alexandre Danilov",
    activity: "etudes",
    signed: 1,
    study: "en_cours",
    ht: 30974,
    vat: 10,
    quotes: [
      { ref: "DE2026-0145", label: "Création des ouvertures", activity: "etudes", ht: 30974, vat: 10, signed: 1 },
    ],
  },
];
