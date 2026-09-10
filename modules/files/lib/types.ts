/**
 * Types du module « fichiers ».
 *
 * Aucun fichier n'entre dans le CRM : ces types décrivent ce que Microsoft
 * Graph rend — chemin, nom, taille, date — et une adresse pour ouvrir le
 * document dans OneDrive. Le contenu reste chez Microsoft, et c'est la leçon
 * des 463 Mo de pièces jointes que la messagerie avait rapatriés sans qu'on
 * l'ait voulu.
 */

export type DriveAccount = {
  id: string;
  email: string;
  display_name: string;
  connected_at: string;
  /** Vide quand tout va bien ; sinon la raison, telle que Microsoft l'a dite. */
  last_error: string;
  /** Vrai quand la copie tourne toutes les cinq minutes. */
  sync_enabled: boolean;
  last_sync_at: string | null;
  /**
   * Les racines surveillées, une par société. Le reste du disque est ignoré.
   * C'est là que l'émetteur d'un devis se lit : « DE2026-0048 » existe des
   * deux côtés.
   */
  sync_roots: DriveRoot[];
};

export type DriveRoot = {
  path: string;
  issuer: string;
};

/**
 * Une copie, telle que le journal la garde.
 *
 * Elle ne compte pas des fichiers mais des **dossiers réconciliés** : un dossier
 * touché est relu en entier, et ce qu'il contient dit où en est l'affaire.
 */
export type DriveRun = {
  id: number;
  started_at: string;
  finished_at: string | null;
  origin: string;
  folders: number;
  customers: number;
  projects: number;
  quotes: number;
  error: string;
};

export type DriveItem = {
  id: string;
  name: string;
  /** Vrai pour un dossier. */
  folder: boolean;
  /** Nombre d'éléments du dossier, nul pour un fichier. */
  child_count: number;
  size: number;
  modified_at: string;
  /** Chemin lisible depuis la racine du disque. */
  path: string;
  /** L'adresse pour l'ouvrir dans OneDrive. */
  web_url: string;
  mime_type: string;
};

export type DriveListing = {
  path: string;
  items: DriveItem[];
};

/**
 * Une affaire devinée d'un nom de dossier.
 *
 * L'arborescence suit `MM-JJ-AAAA_Client`, avec le point ou le tiret
 * indifféremment, et la parenthèse porte le syndic ou le nom de l'immeuble.
 * Vingt-quatre dossiers sur vingt-sept se découpent ainsi ; les trois autres
 * n'ont pas de date et gardent leur nom entier.
 */
export type ParsedFolder = {
  /** Le nom brut du dossier. */
  raw: string;
  /** Le nom du client, débarrassé de la date. */
  client: string;
  /** Ce que la parenthèse contenait : syndic, immeuble, second nom. */
  aside: string;
  /** La date du dossier, AAAA-MM-JJ, ou vide. */
  date: string;
};
