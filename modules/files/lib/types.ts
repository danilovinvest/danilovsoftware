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
