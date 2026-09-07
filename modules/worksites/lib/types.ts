/**
 * Types du module chantiers, miroir de `GET /v1/worksites`.
 *
 * **Un chantier est une affaire signée.** Il n'y a pas de table de chantiers
 * et il n'en faut pas : même client, même intitulé, même adresse, mêmes devis.
 * Ce qui distingue l'exécution de la vente, ce sont les dates et les factures.
 *
 * Ce que le serveur rend, ce sont des **faits** : des dates, des devis, et
 * l'heure à laquelle il a répondu. Aucun jugement — « en cours », « à
 * planifier », « en retard » se déduisent dans `derive.ts`, à partir de
 * `generated_at`. L'horloge d'un poste ne décide pas de ce qui traîne.
 */

/** Un devis ou une facture de l'affaire, avec son fichier sur OneDrive. */
export type WorksiteQuote = {
  id: string;
  reference: string;
  kind: string;
  label: string;
  status: string;
  issued_at: string | null;
  /** Nuls sur toutes les données actuelles : les devis viennent des noms de
      fichiers OneDrive, qui portent une référence et pas un montant. */
  amount_ht: string | null;
  amount_ttc: string | null;
  amount_note: string;
  deposit_status: string;
  balance_status: string;
  drive_url: string;
  drive_name: string;
};

export type Worksite = {
  id: string;
  label: string;
  /** L'étape commerciale, servie telle quelle : `realise` est le seul signal
      de fin dont on dispose — aucune affaire ne porte de date de clôture. */
  stage: "gagne" | "realise";
  outcome: string;
  outcome_note: string;
  notes: string;

  customer_id: string;
  customer_reference: string;
  customer_name: string;
  owner_name: string;

  site_address: string;
  site_postal_code: string;
  /** Ville du chantier si connue, celle de la fiche sinon. */
  city: string;

  started_at: string | null;
  closed_at: string | null;
  created_at: string;

  last_interaction_at: string | null;
  quotes: WorksiteQuote[];
};

export type WorksiteResult = {
  generated_at: string;
  items: Worksite[];
};

/**
 * Où en est l'exécution.
 *
 * Quatre états, pas six : « réception » et « clôture » supposaient un PV et un
 * solde encaissé, que rien dans les données ne suit. Un état qu'aucune donnée
 * ne peut atteindre est une colonne vide qui fait douter du reste.
 *
 * Le statut ne se saisit pas, il se déduit — donc le tableau n'est pas
 * déplaçable. Autoriser le glisser-déposer créerait une seconde vérité, qui
 * divergerait des dates dès la première carte oubliée.
 */
export type WorksiteStatus = "a_planifier" | "planifie" | "en_cours" | "realise";

/** Un chantier, augmenté de ce qui s'en déduit à un instant donné. */
export type ReadWorksite = {
  worksite: Worksite;
  status: WorksiteStatus;
  /** Jours écoulés depuis le démarrage, nul quand aucune date n'est connue. */
  daysRunning: number | null;
  /** Jours depuis la dernière trace d'échange, nul s'il n'y en a jamais eu. */
  daysSilent: number | null;
  /** Vrai dès qu'une facture existe — la référence commence par `FA`. */
  invoiced: boolean;
  /** Vrai quand un devis porte un acompte encaissé. */
  depositReceived: boolean;
  /**
   * Le chiffré du chantier, en HT et TTC.
   *
   * Nuls quand aucun devis n'est chiffré — et c'est fréquent : les devis repris
   * de OneDrive n'ont qu'une référence, seuls ceux recoupés avec l'export du
   * logiciel de devis portent un montant. Un zéro s'afficherait comme un
   * chantier gratuit ; l'absence s'affiche comme une absence.
   */
  amountHT: number | null;
  amountTTC: number | null;
  devis: WorksiteQuote[];
  factures: WorksiteQuote[];
};

export type StatusBucket = {
  status: WorksiteStatus;
  count: number;
};

/** Une ligne de travail : ce qui demande une action aujourd'hui. */
export type Alert = {
  worksite_id: string;
  label: string;
  customer_name: string;
  /** La phrase que le conducteur de travaux lira. */
  reason: string;
  /** Le chiffré, quand il est connu. Nul se lit « non chiffré », pas « zéro ». */
  amount: number | null;
};
