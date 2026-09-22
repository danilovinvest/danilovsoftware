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
  /**
   * Comment le message a rejoint sa fiche : « adresse », « fil », « manuel »,
   * « modele ». Vide quand il n'en a pas. C'est ce qui se mesure pour savoir
   * ce que chaque rapprochement apporte.
   */
  matched_by: string;
  /**
   * Vrai quand le message répond à une conversation (il porte In-Reply-To ou
   * References), faux pour un premier message. Le serveur dit le fait ; l'écran
   * en tire « Réponse » ou « Nouveau ».
   */
  is_reply: boolean;
  /**
   * Le corps a déjà été demandé au serveur, même revenu vide. Servi par la
   * liste d'une fiche seulement : sans lui, un accusé de réception rouvrait
   * IMAP à chaque dépliage.
   */
  body_fetched?: boolean;
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

/**
 * Ce sur quoi la liste des messages porte. Gardé pour la route historique ;
 * l'écran Messagerie lit désormais des conversations (`MailView`). « avec_corps »
 * se libellait « Déjà lus » et voulait dire « corps copié » : l'écran ne le
 * propose plus.
 */
export type MailScope = "tous" | "rapproches" | "sans_fiche" | "avec_corps";

/** Premiers messages ou réponses : une seconde question, croisée avec la portée. */
export type MailKind = "tous" | "nouveaux" | "reponses";

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
  /** En-têtes de fil relus, et messages rattachés par leur fil. */
  threads: number;
  linked: number;
  error: string;
};

/** Ce qu'un rattachement à la main a fait, pour le dire à qui a cliqué. */
export type AttachResult = {
  attached: number;
  /** Les adresses retenues sur la fiche, comme fiche ou comme interlocuteur. */
  remembered: string[];
  email_set: boolean;
  /** Ce que ces adresses ont rattaché en plus, passé et fils compris. */
  rematched: number;
};

/**
 * Les vues de la messagerie (issue 87). « À traiter » est celle qu'on ouvre :
 * les conversations dont le dernier mot est celui d'un correspondant, et que
 * personne n'a marquées traitées depuis.
 */
export type MailView = "a_traiter" | "tous" | "rapproches" | "sans_fiche" | "envoyes";

/** Une conversation, telle qu'une ligne de la liste la montre. */
export type ThreadSummary = {
  /** Le dernier message : c'est par lui qu'on ouvre la conversation. */
  id: string;
  /** La clé du fil dans sa boîte. Deux boîtes, deux conversations. */
  key: string;
  account_id: string;
  account: string;
  /** L'objet du premier message : le dernier commence presque toujours par « Re: ». */
  subject: string;
  snippet: string;
  last_at: string;
  message_count: number;
  /** L'entreprise a écrit dans la conversation. */
  replied: boolean;
  /** Le dernier mot est le nôtre : la balle est chez eux. */
  last_outgoing: boolean;
  last_is_reply: boolean;
  /** Tous ses messages sont des envois en masse. */
  bulk: boolean;
  /** Les correspondants, dans l'ordre où ils ont écrit ; à défaut, les destinataires. */
  correspondents: string[];
  customer_id: string;
  customer_name: string;
  attachment_count: number;
  todo: boolean;
  /** Le dernier « traité », même rouvert depuis. */
  done_at: string | null;
};

export type ThreadCounts = Record<MailView, number>;

export type ThreadPage = {
  items: ThreadSummary[];
  total: number;
  counts: ThreadCounts;
  limit: number;
  offset: number;
};

/** Un message d'une conversation, avec tous ses correspondants. */
export type ThreadMessage = BrowseMessage & {
  participants: string[];
  /** Faux : le corps n'a jamais été demandé au serveur, le déplier s'en charge. */
  body_fetched: boolean;
  bulk: boolean;
};

export type MailThread = {
  key: string;
  account_id: string;
  account: string;
  subject: string;
  customer_id: string;
  customer_name: string;
  todo: boolean;
  done_at: string | null;
  done_by: string;
  /** Vide quand la boîte n'est pas chez Google. */
  gmail_url: string;
  /** Du plus ancien au plus récent. */
  messages: ThreadMessage[];
};
