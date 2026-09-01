import type {
  CustomerKind,
  CustomerSource,
  CustomerStatus,
  PaymentStatus,
  ProjectOutcome,
  ProjectStage,
  QuoteKind,
  QuoteStatus,
} from "@/modules/customers";

/**
 * Jeu de démonstration du tableau de bord.
 *
 * C'est une petite base fictive — des fiches, leurs affaires, leurs devis — et
 * non une collection de chiffres par panneau. La différence est tout l'intérêt
 * du fichier : les onze panneaux de l'écran sont *dérivés* de ces lignes
 * (`lib/snapshot.ts`), donc ils s'accordent entre eux. Le montant du pipeline
 * est bien la somme des affaires ouvertes de la synthèse, la liste des
 * relances contient bien les affaires que la synthèse dit en souffrance, et
 * changer une ligne ici bouge tout l'écran de façon cohérente.
 *
 * Les dates sont des *décalages en jours* et non des dates fixes : l'écran ne
 * vieillit pas, « relancé il y a 21 jours » le restera dans six mois.
 *
 * Les noms, adresses et montants sont inventés. Aucune donnée réelle du
 * bureau d'études ne doit atterrir ici : ce fichier part dans le JavaScript
 * servi au navigateur.
 */

export type SeedQuote = {
  ref: string;
  kind: QuoteKind;
  status: QuoteStatus;
  /** Montant TTC, en euros. */
  amount: number;
  /** Émis il y a N jours. */
  issued: number;
  deposit: PaymentStatus;
  balance: PaymentStatus;
};

export type SeedProject = {
  label: string;
  stage: ProjectStage;
  outcome: ProjectOutcome | null;
  city: string;
  /** Ouverte il y a N jours. */
  started: number;
  /** Dernier échange il y a N jours. */
  lastContact: number;
  /** Nombre de relances déjà passées. */
  reminders: number;
  quotes: SeedQuote[];
};

export type SeedCustomer = {
  id: string;
  name: string;
  kind: CustomerKind;
  status: CustomerStatus;
  source: CustomerSource;
  city: string;
  phone: string;
  owner: string;
  /** Demande reçue il y a N jours. */
  requested: number;
  projects: SeedProject[];
};

/** Les quatre collaborateurs fictifs du bureau d'études. */
export const SEED_OWNERS = [
  "Alexandre Danilov",
  "Léa Vidal",
  "Marc Fabre",
  "Yanis Bouhali",
] as const;

/** Charge de travail hors affaires : les tâches, que ce jeu ne modélise pas. */
export const SEED_TASKS: Record<string, { open: number; overdue: number }> = {
  "Alexandre Danilov": { open: 4, overdue: 1 },
  "Léa Vidal": { open: 11, overdue: 3 },
  "Marc Fabre": { open: 7, overdue: 0 },
  "Yanis Bouhali": { open: 9, overdue: 4 },
};

const none: PaymentStatus = "non_applicable";
const attente: PaymentStatus = "en_attente";
const recu: PaymentStatus = "recu";

export const SEED_CUSTOMERS: SeedCustomer[] = [
  {
    id: "c-01",
    name: "SCI Les Terrasses du Cap",
    kind: "societe",
    status: "client",
    source: "recommandation",
    city: "Roquebrune-Cap-Martin",
    phone: "0493784512",
    owner: "Léa Vidal",
    requested: 268,
    projects: [
      {
        label: "Reprise en sous-œuvre — villa Bellevue",
        stage: "realise",
        outcome: null,
        city: "Roquebrune-Cap-Martin",
        started: 262,
        lastContact: 31,
        reminders: 0,
        quotes: [
          {
            ref: "DEV-2025-118",
            kind: "etude",
            status: "realise",
            amount: 14400,
            issued: 244,
            deposit: recu,
            balance: recu,
          },
          {
            ref: "DEV-2026-004",
            kind: "travaux",
            status: "accepte",
            amount: 28900,
            issued: 74,
            deposit: recu,
            balance: attente,
          },
        ],
      },
      {
        label: "Mur de soutènement — accès garage",
        stage: "devis_envoye",
        outcome: null,
        city: "Roquebrune-Cap-Martin",
        started: 46,
        lastContact: 24,
        reminders: 2,
        quotes: [
          {
            ref: "DEV-2026-031",
            kind: "etude",
            status: "envoye",
            amount: 6800,
            issued: 24,
            deposit: none,
            balance: none,
          },
        ],
      },
    ],
  },
  {
    id: "c-02",
    name: "Cabinet Perrin Architectes",
    kind: "architecte",
    status: "client",
    source: "recommandation",
    city: "Nice",
    phone: "0492156708",
    owner: "Alexandre Danilov",
    requested: 402,
    projects: [
      {
        label: "Note de calcul béton armé — extension Cimiez",
        stage: "realise",
        outcome: null,
        city: "Nice",
        started: 396,
        lastContact: 118,
        reminders: 0,
        quotes: [
          {
            ref: "DEV-2025-062",
            kind: "etude",
            status: "realise",
            amount: 9200,
            issued: 380,
            deposit: recu,
            balance: recu,
          },
        ],
      },
      {
        label: "Charpente bois — combles aménageables",
        stage: "gagne",
        outcome: null,
        city: "Nice",
        started: 58,
        lastContact: 4,
        reminders: 0,
        quotes: [
          {
            ref: "DEV-2026-036",
            kind: "etude",
            status: "accepte",
            amount: 11750,
            issued: 19,
            deposit: attente,
            balance: none,
          },
        ],
      },
      {
        label: "Étude de faisabilité — division parcellaire",
        stage: "proposition_envoyee",
        outcome: null,
        city: "Saint-Laurent-du-Var",
        started: 27,
        lastContact: 12,
        reminders: 1,
        quotes: [],
      },
    ],
  },
  {
    id: "c-03",
    name: "Syndic Foncia Riviera",
    kind: "syndic",
    status: "client",
    source: "email",
    city: "Nice",
    phone: "0497038844",
    owner: "Marc Fabre",
    requested: 331,
    projects: [
      {
        label: "Diagnostic fissures — immeuble Gambetta",
        stage: "realise",
        outcome: null,
        city: "Nice",
        started: 325,
        lastContact: 152,
        reminders: 0,
        quotes: [
          {
            ref: "DEV-2025-095",
            kind: "etude",
            status: "realise",
            amount: 7450,
            issued: 310,
            deposit: recu,
            balance: recu,
          },
        ],
      },
      {
        label: "Sondages de fondations — résidence Le Ponant",
        stage: "devis_envoye",
        outcome: null,
        city: "Nice",
        started: 63,
        lastContact: 38,
        reminders: 3,
        quotes: [
          {
            ref: "DEV-2026-022",
            kind: "sondages",
            status: "envoye",
            amount: 18600,
            issued: 38,
            deposit: none,
            balance: none,
          },
        ],
      },
    ],
  },
  {
    id: "c-04",
    name: "M. et Mme Ferrand",
    kind: "particulier",
    status: "prospect",
    source: "site_web",
    city: "Mougins",
    phone: "0662481903",
    owner: "Yanis Bouhali",
    requested: 9,
    projects: [
      {
        label: "Ouverture de mur porteur — villa Les Cyprès",
        stage: "rdv_planifie",
        outcome: null,
        city: "Mougins",
        started: 9,
        lastContact: 2,
        reminders: 0,
        quotes: [],
      },
    ],
  },
  {
    id: "c-05",
    name: "SAS Bâti Azur",
    kind: "societe",
    status: "client",
    source: "telephone",
    city: "Cannes",
    phone: "0493395522",
    owner: "Léa Vidal",
    requested: 188,
    projects: [
      {
        label: "Renforcement plancher — local commercial rue d'Antibes",
        stage: "realise",
        outcome: null,
        city: "Cannes",
        started: 182,
        lastContact: 63,
        reminders: 0,
        quotes: [
          {
            ref: "DEV-2025-141",
            kind: "etude",
            status: "realise",
            amount: 8050,
            issued: 166,
            deposit: recu,
            balance: recu,
          },
        ],
      },
      {
        label: "Surélévation R+1 — maison de ville Le Suquet",
        stage: "devis_envoye",
        outcome: null,
        city: "Cannes",
        started: 34,
        lastContact: 3,
        reminders: 1,
        quotes: [
          {
            ref: "DEV-2026-039",
            kind: "etude",
            status: "envoye",
            amount: 16200,
            issued: 6,
            deposit: none,
            balance: none,
          },
        ],
      },
    ],
  },
  {
    id: "c-06",
    name: "Copropriété Les Oliviers",
    kind: "syndic",
    status: "prospect",
    source: "email",
    city: "Le Cannet",
    phone: "0493460178",
    owner: "Marc Fabre",
    requested: 71,
    projects: [
      {
        label: "Diagnostic fissures — bâtiment B",
        stage: "proposition_envoyee",
        outcome: null,
        city: "Le Cannet",
        started: 68,
        lastContact: 41,
        reminders: 2,
        quotes: [],
      },
    ],
  },
  {
    id: "c-07",
    name: "Atelier d'architecture Moreau",
    kind: "architecte",
    status: "prospect",
    source: "recommandation",
    city: "Antibes",
    phone: "0493611247",
    owner: "Alexandre Danilov",
    requested: 22,
    projects: [
      {
        label: "Étude de structure — piscine à débordement",
        stage: "etude_a_produire",
        outcome: null,
        city: "Antibes",
        started: 20,
        lastContact: 5,
        reminders: 0,
        quotes: [
          {
            ref: "DEV-2026-041",
            kind: "etude",
            status: "accepte",
            amount: 12400,
            issued: 11,
            deposit: attente,
            balance: none,
          },
        ],
      },
    ],
  },
  {
    id: "c-08",
    name: "M. Boulanger",
    kind: "particulier",
    status: "prospect",
    source: "site_web",
    city: "Vallauris",
    phone: "0678120944",
    owner: "Yanis Bouhali",
    requested: 55,
    projects: [
      {
        label: "Attestation de solidité — véranda",
        stage: "devis_envoye",
        outcome: null,
        city: "Vallauris",
        started: 52,
        lastContact: 29,
        reminders: 1,
        quotes: [
          {
            ref: "DEV-2026-026",
            kind: "attestation",
            status: "envoye",
            amount: 1450,
            issued: 29,
            deposit: none,
            balance: none,
          },
        ],
      },
    ],
  },
  {
    id: "c-09",
    name: "SCI Mimosa",
    kind: "societe",
    status: "prospect",
    source: "telephone",
    city: "Grasse",
    phone: "0493703366",
    owner: "Léa Vidal",
    requested: 96,
    projects: [
      {
        label: "Sondages de sol — terrain en restanques",
        stage: "devis_envoye",
        outcome: null,
        city: "Grasse",
        started: 92,
        lastContact: 47,
        reminders: 2,
        quotes: [
          {
            ref: "DEV-2026-014",
            kind: "sondages",
            status: "envoye",
            amount: 9800,
            issued: 47,
            deposit: none,
            balance: none,
          },
        ],
      },
    ],
  },
  {
    id: "c-10",
    name: "Mme Sanchez",
    kind: "particulier",
    status: "client",
    source: "site_web",
    city: "Cagnes-sur-Mer",
    phone: "0620584417",
    owner: "Yanis Bouhali",
    requested: 141,
    projects: [
      {
        label: "Ouverture de mur porteur — appartement front de mer",
        stage: "realise",
        outcome: null,
        city: "Cagnes-sur-Mer",
        started: 138,
        lastContact: 97,
        reminders: 0,
        quotes: [
          {
            ref: "DEV-2025-152",
            kind: "etude",
            status: "realise",
            amount: 3900,
            issued: 128,
            deposit: recu,
            balance: recu,
          },
        ],
      },
    ],
  },
  {
    id: "c-11",
    name: "Promotion Littoral SAS",
    kind: "societe",
    status: "prospect",
    source: "recommandation",
    city: "Villeneuve-Loubet",
    phone: "0492027715",
    owner: "Alexandre Danilov",
    requested: 17,
    projects: [
      {
        label: "Étude de structure — résidence 24 logements",
        stage: "proposition_envoyee",
        outcome: null,
        city: "Villeneuve-Loubet",
        started: 15,
        lastContact: 1,
        reminders: 0,
        quotes: [
          {
            ref: "DEV-2026-043",
            kind: "etude",
            status: "envoye",
            amount: 42000,
            issued: 3,
            deposit: none,
            balance: none,
          },
        ],
      },
    ],
  },
  {
    id: "c-12",
    name: "M. Ravel",
    kind: "particulier",
    status: "perdu",
    source: "site_web",
    city: "Menton",
    phone: "0685339021",
    owner: "Marc Fabre",
    requested: 122,
    projects: [
      {
        label: "Étude de structure — surélévation garage",
        stage: "devis_envoye",
        outcome: "concurrence",
        city: "Menton",
        started: 119,
        lastContact: 74,
        reminders: 2,
        quotes: [
          {
            ref: "DEV-2026-002",
            kind: "etude",
            status: "refuse",
            amount: 5600,
            issued: 96,
            deposit: none,
            balance: none,
          },
        ],
      },
    ],
  },
  {
    id: "c-13",
    name: "Syndic Citya Côte d'Azur",
    kind: "syndic",
    status: "prospect",
    source: "email",
    city: "Nice",
    phone: "0489045590",
    owner: "Marc Fabre",
    requested: 35,
    projects: [
      {
        label: "Reprise de balcons — résidence Saint-Roch",
        stage: "etude_a_produire",
        outcome: "bloque_tiers",
        city: "Nice",
        started: 33,
        lastContact: 26,
        reminders: 1,
        quotes: [
          {
            ref: "DEV-2026-034",
            kind: "etude",
            status: "accepte",
            amount: 21500,
            issued: 26,
            deposit: attente,
            balance: none,
          },
        ],
      },
    ],
  },
  {
    id: "c-14",
    name: "Hôtel Belle Rive",
    kind: "societe",
    status: "prospect",
    source: "telephone",
    city: "Beaulieu-sur-Mer",
    phone: "0493010288",
    owner: "Léa Vidal",
    requested: 6,
    projects: [
      {
        label: "Étude de structure — création de spa en sous-sol",
        stage: "qualification",
        outcome: null,
        city: "Beaulieu-sur-Mer",
        started: 6,
        lastContact: 1,
        reminders: 0,
        quotes: [],
      },
    ],
  },
  {
    id: "c-15",
    name: "M. et Mme Nguyen",
    kind: "particulier",
    status: "prospect",
    source: "site_web",
    city: "Valbonne",
    phone: "0647902231",
    owner: "Yanis Bouhali",
    requested: 3,
    projects: [
      {
        label: "Ouverture de mur porteur — cuisine ouverte",
        stage: "demande_recue",
        outcome: null,
        city: "Valbonne",
        started: 3,
        lastContact: 3,
        reminders: 0,
        quotes: [],
      },
    ],
  },
  {
    id: "c-16",
    name: "Cabinet Laurent & Associés",
    kind: "architecte",
    status: "client",
    source: "recommandation",
    city: "Cannes",
    phone: "0493991164",
    owner: "Alexandre Danilov",
    requested: 232,
    projects: [
      {
        label: "Note de calcul — villa contemporaine Super-Cannes",
        stage: "realise",
        outcome: null,
        city: "Cannes",
        started: 228,
        lastContact: 44,
        reminders: 0,
        quotes: [
          {
            ref: "DEV-2025-127",
            kind: "etude",
            status: "realise",
            amount: 16800,
            issued: 205,
            deposit: recu,
            balance: recu,
          },
          {
            ref: "DEV-2026-018",
            kind: "etude",
            status: "accepte",
            amount: 10300,
            issued: 44,
            deposit: recu,
            balance: attente,
          },
        ],
      },
      {
        label: "Étude de structure — piscine sur pilotis",
        stage: "rdv_planifie",
        outcome: null,
        city: "Le Cannet",
        started: 12,
        lastContact: 2,
        reminders: 0,
        quotes: [],
      },
    ],
  },
  {
    id: "c-17",
    name: "SCI Le Clos des Vignes",
    kind: "societe",
    status: "prospect",
    source: "autre",
    city: "Biot",
    phone: "0493655719",
    owner: "Marc Fabre",
    requested: 84,
    projects: [
      {
        label: "Étude de structure — réhabilitation de bastide",
        stage: "proposition_envoyee",
        outcome: "stand_by",
        city: "Biot",
        started: 80,
        lastContact: 52,
        reminders: 1,
        quotes: [],
      },
    ],
  },
  {
    id: "c-18",
    name: "Mme Ferrari",
    kind: "particulier",
    status: "prospect",
    source: "telephone",
    city: "Saint-Laurent-du-Var",
    phone: "0611473308",
    owner: "Léa Vidal",
    requested: 64,
    projects: [
      {
        label: "Attestation de solidité — pose de spa sur terrasse",
        stage: "qualification",
        outcome: "sans_reponse",
        city: "Saint-Laurent-du-Var",
        started: 61,
        lastContact: 58,
        reminders: 3,
        quotes: [],
      },
    ],
  },
];

/** Rendez-vous et jalons des prochains jours, que les affaires ne portent pas. */
export const SEED_AGENDA: Array<{
  id: string;
  inDays: number;
  hour: number;
  kind: "rdv" | "etude" | "relance" | "devis" | "chantier";
  label: string;
  customer: string;
  owner: string;
}> = [
  {
    id: "a-1",
    inDays: 0,
    hour: 14,
    kind: "rdv",
    label: "Visite technique sur site",
    customer: "M. et Mme Ferrand",
    owner: "Yanis Bouhali",
  },
  {
    id: "a-2",
    inDays: 0,
    hour: 17,
    kind: "relance",
    label: "Relancer le devis DEV-2026-014",
    customer: "SCI Mimosa",
    owner: "Léa Vidal",
  },
  {
    id: "a-3",
    inDays: 1,
    hour: 9,
    kind: "etude",
    label: "Remise de la note de calcul",
    customer: "Atelier d'architecture Moreau",
    owner: "Alexandre Danilov",
  },
  {
    id: "a-4",
    inDays: 1,
    hour: 15,
    kind: "devis",
    label: "Chiffrage à envoyer — spa en sous-sol",
    customer: "Hôtel Belle Rive",
    owner: "Léa Vidal",
  },
  {
    id: "a-5",
    inDays: 2,
    hour: 10,
    kind: "rdv",
    label: "Réunion de chantier — reprise de balcons",
    customer: "Syndic Citya Côte d'Azur",
    owner: "Marc Fabre",
  },
  {
    id: "a-6",
    inDays: 4,
    hour: 11,
    kind: "rdv",
    label: "Visite piscine sur pilotis",
    customer: "Cabinet Laurent & Associés",
    owner: "Alexandre Danilov",
  },
  {
    id: "a-7",
    inDays: 5,
    hour: 8,
    kind: "chantier",
    label: "Sondages de sol — intervention foreuse",
    customer: "SCI Mimosa",
    owner: "Léa Vidal",
  },
  {
    id: "a-8",
    inDays: 7,
    hour: 16,
    kind: "etude",
    label: "Rendu étude — surélévation Le Suquet",
    customer: "SAS Bâti Azur",
    owner: "Léa Vidal",
  },
  {
    id: "a-9",
    inDays: 9,
    hour: 10,
    kind: "relance",
    label: "Point d'avancement promoteur",
    customer: "Promotion Littoral SAS",
    owner: "Alexandre Danilov",
  },
];
