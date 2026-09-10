/**
 * Types du module calendrier.
 *
 * Le CRM tient désormais ses propres événements ; ces types sont les siens et
 * non plus ceux de l'API Google. Ce qui vient d'un import garde `imported` à
 * vrai, avec son organisateur et ses invités recopiés — affichés, jamais
 * modifiables : ils appartiennent à l'agenda d'origine, et prétendre les éditer
 * sans pouvoir envoyer d'invitation serait mentir.
 */

export type ResponseStatus = "accepted" | "declined" | "tentative" | "needsAction";

/** Un invité, tel que l'import l'a recopié depuis Google. */
export type Attendee = {
  email?: string;
  displayName?: string;
  responseStatus: ResponseStatus;
  organizer?: boolean;
  optional?: boolean;
  self?: boolean;
};

/**
 * De quoi il s'agit.
 *
 * L'agenda ne portait que des titres : rien ne distinguait un échange
 * téléphonique d'une visite de chantier, et il fallait lire pour savoir. Les
 * cinq valeurs sont celles de l'énumération SQL — « autre » recueille tout ce
 * qui n'est aucune des quatre, y compris ce qu'un import a rapporté sans qu'on
 * sache le classer.
 */
export type EventKind = "echange" | "rdv" | "chantier" | "interne" | "autre";

export type CalendarEvent = {
  id: string;
  calendar_id: string;
  calendar_name: string;
  /** Rang dans la palette du thème, jamais une couleur littérale. */
  color: number;
  title: string;
  description: string;
  location: string;
  /** Instants ISO 8601. Une journée entière est bornée à minuit local, et sa
   * fin est **exclusive** : un événement d'un seul jour porte le lendemain. */
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  imported: boolean;
  organizer: string;
  attendees: Attendee[];
  meet_url: string;
  /**
   * La fiche concernée, nulle pour ce qui ne concerne personne — une réunion
   * interne, un congé. Le nom voyage avec l'identifiant : l'agenda l'affiche
   * sans avoir à charger trois cent soixante-six fiches pour en nommer une.
   */
  customer_id: string | null;
  customer_name: string;
  kind: EventKind;
  updated_at: string;
};

export type Calendar = {
  id: string;
  name: string;
  color: number;
  visible: boolean;
  event_count: number;
  /** Renseigné quand l'agenda vient d'un import Google. */
  google_calendar_id: string;
};

export type EventInput = {
  calendar_id: string;
  title: string;
  description: string;
  location: string;
  all_day: boolean;
  /** ISO 8601 pour un horaire, AAAA-MM-JJ pour une journée entière. */
  start: string;
  end: string;
  /** La fiche concernée. Nulle pour ce qui ne concerne aucun client. */
  customer_id: string | null;
  /**
   * Toujours envoyée, jamais omise : l'écriture remplace l'événement entier, et
   * un champ absent retomberait sur « autre » en effaçant silencieusement la
   * catégorie qu'on venait de choisir.
   */
  kind: EventKind;
};

/**
 * Une occurrence prête à peindre : les bornes résolues en `Date`, et le
 * découpage jour-entier / horaire déjà tranché. Les composants ne manipulent
 * jamais les chaînes ISO directement.
 */
export type Occurrence = {
  key: string;
  event: CalendarEvent;
  start: Date;
  end: Date;
  allDay: boolean;
  calendarName: string;
  style: CalendarStyle;
};

/** Les classes d'un agenda. Résolues une fois, portées par l'occurrence. */
export type CalendarStyle = {
  dot: string;
  soft: string;
  text: string;
  solid: string;
  rail: string;
};

export type CalendarView = "mois" | "semaine" | "agenda";

/* --- Le miroir Google, réduit à ce qu'il sert : importer -------------------- */

export type GoogleAccount = {
  id: string;
  email: string;
  scope: string;
  connected_at: string;
  last_sync_at: string | null;
  /** Vide quand tout va bien ; sinon la raison, telle que Google l'a dite. */
  last_error: string;
};

/** Un agenda du compte Google, tel que la copie le connaît. */
export type MirrorCalendar = {
  id: string;
  account_id: string;
  summary: string;
  description: string;
  time_zone: string;
  access_role: string;
  primary: boolean;
  /** Recopié dans le miroir, donc importable. */
  selected: boolean;
  event_count: number;
  synced_at: string | null;
};

/**
 * Un changement, tel que l'import le raconte.
 *
 * Un compteur ne suffit pas : « 5 mis à jour » ne dit pas *lequel* a bougé, et
 * c'est justement ce qu'on veut savoir quand un rendez-vous se déplace.
 */
export type ImportChange = {
  kind:
    | "ajout"
    | "maj"
    | "conflit"
    | "suppression"
    | "conflit_suppression"
    /** Présent chez Google, inaffichable ici — une durée nulle, par exemple. */
    | "ignore";
  calendar: string;
  title: string;
  starts_at: string;
  /** Ce qui a changé, en clair. Vide pour un ajout, qui n'a rien à comparer. */
  detail: string;
};

export type ImportReport = {
  calendars: number;
  added: number;
  /** Repris de Google : modifiés là-bas, jamais corrigés ici. */
  updated: number;
  /** Déjà connus et identiques. */
  unchanged: number;
  /** Modifiés chez Google **et** corrigés ici : laissés tels quels. */
  conflicts: number;
  /** Supprimés chez Google, donc retirés du CRM. */
  removed: number;
  changes: ImportChange[];
};

/** Une exécution de l'import, telle que le journal la garde. */
export type ImportRun = ImportReport & {
  id: string;
  started_at: string;
  /**
   * Nul veut dire « en cours », comme pour le miroir. Sans cette date, une
   * exécution tuée en cours de route serait indiscernable d'une exécution
   * parfaite à zéro changement — et c'est exactement ce qu'on veut voir quand
   * l'agenda décroche.
   */
  finished_at: string | null;
  /** « automatique » ou « manuelle ». */
  origin: string;
  /** Vide pour un import automatique : personne ne l'a mené. */
  author_name: string;
  error: string;
};

/**
 * Une exécution de la copie du miroir Google.
 *
 * `finished_at` nul veut dire « en cours », et c'est la seule chose qui fasse
 * dire au badge qu'une copie tourne. Le déduire d'une horloge mentirait dès
 * qu'une exécution dure plus longtemps que prévu.
 */
export type SyncRun = {
  id: number;
  email: string;
  started_at: string;
  finished_at: string | null;
  /** « automatique », « manuelle » ou « raccordement ». */
  origin: string;
  calendars: number;
  created: number;
  updated: number;
  deleted: number;
  error: string;
  details: SyncDetail[];
};

export type SyncDetail = {
  calendar: string;
  summary: string;
  /** « complète » ou « incrémentale ». */
  mode: string;
  created: number;
  updated: number;
  deleted: number;
  error?: string;
};
