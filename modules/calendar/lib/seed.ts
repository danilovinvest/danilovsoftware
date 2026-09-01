import type { CalendarListEntry, ResponseStatus } from "./types";

/**
 * Le contenu du calendrier, tel qu'une synchronisation Google le rendrait.
 *
 * Les événements sont posés en **semaine + jour de semaine** plutôt qu'en
 * décalage de jours : un rendez-vous de chantier ne tombe pas un dimanche, et
 * un simple « dans 12 jours » finirait tôt ou tard par en placer un. La semaine
 * 0 est celle d'aujourd'hui, lundi = 1.
 *
 * Les clients cités sont ceux de l'export de devis, pour que le calendrier et
 * le tableau de bord parlent des mêmes affaires.
 */

const TEAM = {
  alex: { email: "alexandre.danilov@omptstructure.com", displayName: "Alexandre Danilov" },
  lea: { email: "lea.vidal@omptstructure.com", displayName: "Léa Vidal" },
  marc: { email: "marc.fabre@omptstructure.com", displayName: "Marc Fabre" },
  yanis: { email: "yanis.bouhali@omptstructure.com", displayName: "Yanis Bouhali" },
} as const;

export const ACCOUNT_EMAIL = TEAM.alex.email;

export const CALENDARS: CalendarListEntry[] = [
  {
    id: "chantier",
    summary: "Chantiers & visites",
    description: "Visites techniques, relevés, réunions de chantier",
    colorKey: "chantier",
    primary: true,
    accessRole: "owner",
    timeZone: "Europe/Paris",
  },
  {
    id: "etude",
    summary: "Études & rendus",
    description: "Échéances de production : notes de calcul, plans, dossiers",
    colorKey: "etude",
    accessRole: "owner",
    timeZone: "Europe/Paris",
  },
  {
    id: "client",
    summary: "Clients & prospection",
    description: "Rendez-vous commerciaux, présentations de devis, signatures",
    colorKey: "client",
    accessRole: "owner",
    timeZone: "Europe/Paris",
  },
  {
    id: "interne",
    summary: "Réunions internes",
    description: "Points d'équipe et revues récurrentes",
    colorKey: "interne",
    accessRole: "writer",
    timeZone: "Europe/Paris",
  },
  {
    id: "absence",
    summary: "Absences & congés",
    description: "Agenda partagé de l'équipe",
    colorKey: "absence",
    accessRole: "reader",
    timeZone: "Europe/Paris",
  },
];

type SeedAttendee = {
  who: keyof typeof TEAM | string;
  status?: ResponseStatus;
  optional?: boolean;
};

export type SeedEvent = {
  id: string;
  calendarId: string;
  summary: string;
  /** Semaine relative à celle d'aujourd'hui ; lundi = 1. */
  week: number;
  weekday: number;
  /** Heure de début « HH:MM ». Absente pour un événement de journée entière. */
  start?: string;
  /** Durée en minutes. */
  minutes?: number;
  /** Nombre de jours pour un événement de journée entière. */
  days?: number;
  location?: string;
  description?: string;
  attendees?: SeedAttendee[];
  meet?: boolean;
  customer?: string;
  status?: "confirmed" | "tentative";
  eventType?: "outOfOffice" | "focusTime";
};

/** Résout un invité : un membre de l'équipe, ou un externe dont on n'a que le nom. */
export function resolveAttendee(entry: SeedAttendee) {
  const known = TEAM[entry.who as keyof typeof TEAM];
  return {
    email: known?.email,
    displayName: known?.displayName ?? String(entry.who),
    responseStatus: entry.status ?? "accepted",
    optional: entry.optional,
  };
}

export const ORGANIZERS = TEAM;

/**
 * Séries récurrentes. Elles sont dépliées sur toute la fenêtre affichée, comme
 * le fait `singleEvents=true` côté API — le composant ne voit que des
 * occurrences, jamais une RRULE à interpréter.
 */
export type SeedRecurring = {
  id: string;
  calendarId: string;
  summary: string;
  /** 1 = lundi. */
  weekday: number;
  start: string;
  minutes: number;
  rrule: string;
  /** Pour une série mensuelle : n-ième occurrence du jour dans le mois. */
  nth?: number;
  location?: string;
  description?: string;
  attendees?: SeedAttendee[];
  meet?: boolean;
};

export const RECURRING: SeedRecurring[] = [
  {
    id: "rec-hebdo",
    calendarId: "interne",
    summary: "Point hebdomadaire — affaires en cours",
    weekday: 1,
    start: "09:00",
    minutes: 45,
    rrule: "RRULE:FREQ=WEEKLY;BYDAY=MO",
    location: "25 avenue de Grasse, Cannes — salle de réunion",
    description:
      "Tour de table des affaires en cours, arbitrage des priorités de la semaine.",
    attendees: [
      { who: "alex" },
      { who: "lea" },
      { who: "marc" },
      { who: "yanis" },
    ],
  },
  {
    id: "rec-devis",
    calendarId: "interne",
    summary: "Revue des devis en attente",
    weekday: 4,
    start: "17:00",
    minutes: 60,
    rrule: "RRULE:FREQ=WEEKLY;BYDAY=TH",
    description:
      "Passage en revue des devis restés sans réponse : qui relance, et sur quel argument.",
    attendees: [{ who: "alex" }, { who: "lea" }, { who: "yanis" }],
    meet: true,
  },
  {
    id: "rec-croisette",
    calendarId: "chantier",
    summary: "Réunion de chantier — 120 bd de la Croisette",
    weekday: 3,
    start: "08:30",
    minutes: 90,
    rrule: "RRULE:FREQ=WEEKLY;BYDAY=WE",
    location: "120 boulevard de la Croisette, 06400 Cannes",
    description: "Réunion hebdomadaire de chantier avec la maîtrise d'œuvre.",
    attendees: [{ who: "alex" }, { who: "Maître d'œuvre — cabinet Perrin" }],
  },
  {
    id: "rec-facturation",
    calendarId: "interne",
    summary: "Point facturation & TVA",
    weekday: 2,
    nth: 1,
    start: "14:00",
    minutes: 90,
    rrule: "RRULE:FREQ=MONTHLY;BYDAY=1TU",
    location: "Visioconférence",
    description:
      "Situation des encours, préparation de la CA3 des cinq sociétés avec le cabinet comptable.",
    attendees: [
      { who: "alex" },
      { who: "marc" },
      { who: "Cabinet comptable — Mme Ferrand", status: "tentative" },
    ],
    meet: true,
  },
];

export const EVENTS: SeedEvent[] = [
  // ---- Semaine -3 ---------------------------------------------------------
  { id: "e-301", calendarId: "chantier", summary: "Visite technique — Marafioti", week: -3, weekday: 2, start: "09:30", minutes: 120, location: "Le Cannet", customer: "Marafioti", attendees: [{ who: "lea" }] },
  { id: "e-302", calendarId: "etude", summary: "Rendu note de calcul — Krieger", week: -3, weekday: 3, start: "14:00", minutes: 180, description: "Ouverture de murs porteurs, renforcement métallique et BA.", customer: "Krieger" },
  { id: "e-303", calendarId: "client", summary: "Présentation du devis — Chantre", week: -3, weekday: 4, start: "11:00", minutes: 60, customer: "Chantre", meet: true },
  { id: "e-304", calendarId: "chantier", summary: "Sondages structurels — Lozé", week: -3, weekday: 5, start: "08:00", minutes: 240, location: "Antibes", customer: "Lozé", attendees: [{ who: "yanis" }] },

  // ---- Semaine -2 ---------------------------------------------------------
  { id: "e-201", calendarId: "chantier", summary: "Relevé sur site — Coudert", week: -2, weekday: 1, start: "10:30", minutes: 90, location: "Vallauris", customer: "Coudert" },
  { id: "e-202", calendarId: "etude", summary: "Plans d'exécution — Lejeune", week: -2, weekday: 2, start: "09:00", minutes: 240, eventType: "focusTime", customer: "Lejeune" },
  { id: "e-203", calendarId: "client", summary: "Appel — Souheil Benmansour", week: -2, weekday: 3, start: "16:00", minutes: 30, description: "Rénovation de deux appartements de 3 pièces : arbitrage entre les deux devis.", customer: "Souheil Benmansour" },
  { id: "e-204", calendarId: "chantier", summary: "Réception de travaux — Ciolfi", week: -2, weekday: 4, start: "14:30", minutes: 120, location: "Nice", customer: "Ciolfi", attendees: [{ who: "marc" }] },
  { id: "e-205", calendarId: "absence", summary: "Formation Eurocode 8 — parasismique", week: -2, weekday: 4, days: 2, description: "Formation continue, Marseille.", attendees: [{ who: "yanis" }] },

  // ---- Semaine -1 ---------------------------------------------------------
  { id: "e-101", calendarId: "chantier", summary: "Visite technique — Svetlana Anisimova", week: -1, weekday: 1, start: "09:30", minutes: 150, location: "Cannes", description: "Renforcement de plancher, immeuble ancien. Relevé complémentaire des poutres.", customer: "Svetlana Anisimova", attendees: [{ who: "alex" }, { who: "lea" }] },
  { id: "e-102", calendarId: "etude", summary: "Descente de charges — DEQUAIRE", week: -1, weekday: 2, start: "13:30", minutes: 210, eventType: "focusTime", customer: "DEQUAIRE" },
  { id: "e-103", calendarId: "client", summary: "Signature — Giusti", week: -1, weekday: 3, start: "11:30", minutes: 45, location: "25 avenue de Grasse, Cannes", customer: "Giusti" },
  { id: "e-104", calendarId: "chantier", summary: "Sondages de fondations — Garcini", week: -1, weekday: 4, start: "08:00", minutes: 300, location: "Grasse", customer: "Garcini", attendees: [{ who: "yanis" }] },
  { id: "e-105", calendarId: "etude", summary: "Dépôt de la déclaration préalable — Urso", week: -1, weekday: 5, start: "10:00", minutes: 60, customer: "Urso" },

  // ---- Semaine courante ---------------------------------------------------
  { id: "e-001", calendarId: "chantier", summary: "Visite technique — LACQUEMENT", week: 0, weekday: 1, start: "10:00", minutes: 120, location: "Cannes", description: "Création d'une porte dans le mur porteur entre deux logements.", customer: "LACQUEMENT", attendees: [{ who: "yanis" }] },
  { id: "e-002", calendarId: "client", summary: "Appel — Ahmed Kazzaz", week: 0, weekday: 1, start: "15:30", minutes: 45, description: "Sept devis en attente : hiérarchiser les lots à lancer en premier.", customer: "Ahmed Kazzaz", attendees: [{ who: "alex" }], meet: true },
  { id: "e-003", calendarId: "etude", summary: "Note de calcul — Copropriété PALAIS SELVOSA", week: 0, weekday: 2, start: "09:00", minutes: 300, description: "Renforcement partiel du plancher haut du garage. Rendu attendu vendredi.", eventType: "focusTime", customer: "Copropriété PALAIS SELVOSA" },
  { id: "e-004", calendarId: "client", summary: "Présentation du devis — Le Faucheur", week: 0, weekday: 2, start: "16:30", minutes: 60, location: "Mougins", customer: "Le Faucheur", attendees: [{ who: "lea" }], status: "tentative" },
  { id: "e-005", calendarId: "chantier", summary: "Relevé — David Haziza, 67 bd Croisette", week: 0, weekday: 3, start: "11:00", minutes: 120, location: "67 boulevard de la Croisette, Cannes", description: "Lots démolition, électricité et plomberie : relevé contradictoire avec les entreprises.", customer: "David Haziza", attendees: [{ who: "alex" }, { who: "marc" }] },
  { id: "e-006", calendarId: "etude", summary: "Vérification plans — Jennifer MARQUES", week: 0, weekday: 3, start: "14:30", minutes: 150, customer: "Jennifer MARQUES" },
  { id: "e-007", calendarId: "chantier", summary: "Réunion de chantier — Citya Nice Immobilière", week: 0, weekday: 4, start: "10:00", minutes: 90, location: "Nice", description: "Confortement du plancher haut des caves.", customer: "Citya Nice Immobilière", attendees: [{ who: "marc" }] },
  { id: "e-008", calendarId: "client", summary: "Café prospection — Cabinet VIELLE&CIE", week: 0, weekday: 4, start: "08:30", minutes: 60, location: "Cannes", customer: "Cabinet VIELLE&CIE", status: "tentative" },
  { id: "e-009", calendarId: "etude", summary: "Rendu — Copropriété PALAIS SELVOSA", week: 0, weekday: 5, start: "11:00", minutes: 60, description: "Envoi de la note de calcul et du plan de renforcement.", customer: "Copropriété PALAIS SELVOSA" },
  { id: "e-010", calendarId: "chantier", summary: "Sondages structurels — Maia", week: 0, weekday: 5, start: "14:00", minutes: 180, location: "Antibes", customer: "Maia", attendees: [{ who: "yanis" }] },

  // ---- Semaine +1 ---------------------------------------------------------
  { id: "e-101b", calendarId: "chantier", summary: "Visite technique — Baud", week: 1, weekday: 1, start: "09:30", minutes: 150, location: "Beaulieu-sur-Mer", description: "Travaux de reprise et de renforcement structurel. Client anglophone.", customer: "Baud", attendees: [{ who: "alex" }] },
  { id: "e-102b", calendarId: "etude", summary: "Note de calcul — Vidal", week: 1, weekday: 1, start: "14:00", minutes: 210, eventType: "focusTime", customer: "Vidal" },
  { id: "e-103b", calendarId: "client", summary: "Point projet — Florence MITHAT", week: 1, weekday: 2, start: "10:00", minutes: 90, description: "Quatre devis : plancher collaborant, abaissement du plancher bas, reprise de fondations.", customer: "Florence MITHAT", attendees: [{ who: "alex" }, { who: "lea" }], meet: true },
  { id: "e-104b", calendarId: "chantier", summary: "Réception de travaux — Deroche", week: 1, weekday: 3, start: "14:00", minutes: 120, location: "Le Cannet", customer: "Deroche", attendees: [{ who: "marc" }] },
  { id: "e-105b", calendarId: "absence", summary: "Congés — Léa Vidal", week: 1, weekday: 3, days: 3, eventType: "outOfOffice", attendees: [{ who: "lea" }] },
  { id: "e-106b", calendarId: "etude", summary: "Plans d'exécution — JOVANOVIC", week: 1, weekday: 4, start: "09:00", minutes: 300, description: "Réhabilitation et extension d'une maison, construction d'un garage.", eventType: "focusTime", customer: "JOVANOVIC" },
  { id: "e-107b", calendarId: "client", summary: "Relance téléphonique — DEQUAIRE", week: 1, weekday: 5, start: "09:30", minutes: 30, customer: "DEQUAIRE" },
  { id: "e-108b", calendarId: "chantier", summary: "Visite technique — Miller", week: 1, weekday: 5, start: "11:00", minutes: 120, location: "Antibes", customer: "Miller", attendees: [{ who: "yanis" }] },

  // ---- Semaine +2 ---------------------------------------------------------
  { id: "e-201b", calendarId: "chantier", summary: "Relevé — Souheil Benmansour", week: 2, weekday: 1, start: "10:00", minutes: 150, location: "Cannes", customer: "Souheil Benmansour" },
  { id: "e-202b", calendarId: "etude", summary: "Descente de charges — Ahmed Kazzaz", week: 2, weekday: 2, start: "09:00", minutes: 240, description: "Poolhouse : abaissement du niveau de plancher et surélévation.", eventType: "focusTime", customer: "Ahmed Kazzaz" },
  { id: "e-203b", calendarId: "client", summary: "Présentation du devis — RAMBONIMANANA", week: 2, weekday: 2, start: "15:00", minutes: 60, customer: "RAMBONIMANANA", meet: true },
  { id: "e-204b", calendarId: "chantier", summary: "Réunion de chantier — Lamy Cannes Syndic", week: 2, weekday: 3, start: "14:00", minutes: 90, location: "Cannes", customer: "Lamy Cannes Syndic", attendees: [{ who: "marc" }] },
  { id: "e-205b", calendarId: "etude", summary: "Rendu — Jennifer MARQUES", week: 2, weekday: 4, start: "11:00", minutes: 60, customer: "Jennifer MARQUES" },
  { id: "e-206b", calendarId: "client", summary: "Signature — Le Faucheur", week: 2, weekday: 4, start: "16:00", minutes: 45, location: "25 avenue de Grasse, Cannes", customer: "Le Faucheur", status: "tentative" },
  { id: "e-207b", calendarId: "chantier", summary: "Sondages structurels — Dalbera", week: 2, weekday: 5, start: "08:30", minutes: 240, location: "Nice", customer: "Dalbera", attendees: [{ who: "yanis" }] },

  // ---- Semaine +3 ---------------------------------------------------------
  { id: "e-301b", calendarId: "absence", summary: "Fermeture du bureau", week: 3, weekday: 1, days: 1, description: "Pont — permanence téléphonique assurée par Marc Fabre." },
  { id: "e-302b", calendarId: "chantier", summary: "Visite technique — Charon", week: 3, weekday: 2, start: "09:30", minutes: 120, location: "Cannes", customer: "Charon" },
  { id: "e-303b", calendarId: "etude", summary: "Note de calcul — Lusso", week: 3, weekday: 3, start: "13:30", minutes: 210, eventType: "focusTime", customer: "Lusso" },
  { id: "e-304b", calendarId: "client", summary: "Point annuel — Cabinet Perrin Architectes", week: 3, weekday: 4, start: "10:00", minutes: 90, location: "Nice", description: "Bilan des affaires communes et prévisionnel du prochain exercice.", customer: "Cabinet Perrin Architectes", attendees: [{ who: "alex" }], meet: true },
  { id: "e-305b", calendarId: "chantier", summary: "Réception de travaux — Cordier", week: 3, weekday: 5, start: "14:30", minutes: 120, location: "Mougins", customer: "Cordier", attendees: [{ who: "marc" }] },

  // ---- Semaine +4 ---------------------------------------------------------
  { id: "e-401b", calendarId: "etude", summary: "Plans d'exécution — Balmain", week: 4, weekday: 1, start: "09:00", minutes: 300, eventType: "focusTime", customer: "Balmain" },
  { id: "e-402b", calendarId: "chantier", summary: "Visite technique — Wasiack", week: 4, weekday: 2, start: "10:30", minutes: 120, location: "Cagnes-sur-Mer", description: "Reprise du garde-corps de balcon.", customer: "Wasiack" },
  { id: "e-403b", calendarId: "client", summary: "Présentation du devis — Cochin", week: 4, weekday: 3, start: "15:00", minutes: 60, customer: "Cochin", meet: true },
  { id: "e-404b", calendarId: "chantier", summary: "Réunion de chantier — SDC", week: 4, weekday: 4, start: "09:00", minutes: 90, location: "Cannes", customer: "SDC", attendees: [{ who: "marc" }] },
];
