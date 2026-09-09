/**
 * Types du module messagerie.
 *
 * Deux niveaux de copie, et ils se lisent dans ces types : tous les messages
 * ont un `snippet` et des en-têtes, seuls ceux rapprochés d'une fiche ont un
 * `body` et des pièces jointes. Ce n'est pas un choix d'affichage — le corps
 * des autres n'est jamais entré dans la base.
 */

export type MailAccount = {
  id: string;
  email: string;
  host: string;
  port: number;
  /** Début de la fenêtre de lecture, AAAA-MM-JJ. */
  since: string;
  connected_at: string;
  last_sync_at: string | null;
  /** Vide quand tout va bien ; sinon la raison, telle que le serveur l'a dite. */
  last_error: string;
  message_count: number;
  matched_count: number;
  /** Combien de messages ont leur contenu en base. */
  body_count: number;
  /**
   * Vrai quand les copies suivantes prennent le corps de **tous** les messages.
   * Faux par défaut : une boîte partagée contient aussi la banque, l'URSSAF et
   * la vie privée du dirigeant.
   */
  copy_all: boolean;
};

export type MailMessage = {
  id: string;
  subject: string;
  from_email: string;
  from_name: string;
  sent_at: string;
  /** Vrai quand l'entreprise a écrit ce message, faux quand elle l'a reçu. */
  outgoing: boolean;
  snippet: string;
  body: string;
  attachment_count: number;
};

export type MailAttachment = {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
};

/**
 * Un message tel que le parcours de la boîte le rend.
 *
 * `has_body` dit si le corps est déjà en base. Faux ne veut pas dire « pas de
 * contenu » : cela veut dire qu'il n'a pas encore été demandé au serveur, et
 * l'ouverture du message s'en charge.
 */
export type BrowseMessage = MailMessage & {
  customer_id: string;
  customer_name: string;
  matched: boolean;
  has_body: boolean;
  /**
   * L'adresse de la boîte qui a reçu le message.
   *
   * Elle ne sert que lorsqu'il y en a plusieurs — avec une seule, la répéter
   * sur chaque ligne n'apprendrait rien.
   */
  account: string;
};

export type MailPage = {
  items: BrowseMessage[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

/** Ce sur quoi la liste porte. */
export type MailScope = "tous" | "rapproches" | "sans_fiche" | "avec_corps";

/** Un correspondant régulier qui n'a pas de fiche. On ne connaît de lui que son
 * adresse, son nom d'affichage et sa fréquence : son courrier n'est pas en base. */
export type UnknownSender = {
  email: string;
  name: string;
  total: number;
  first_seen: string;
  last_seen: string;
};

export type MailRun = {
  id: number;
  email: string;
  started_at: string;
  finished_at: string | null;
  origin: string;
  fetched: number;
  matched: number;
  attachments: number;
  /** Corps rattrapés sur des messages déjà copiés. */
  bodies: number;
  error: string;
};
