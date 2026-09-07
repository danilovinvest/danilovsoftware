/**
 * Types du module marketing, miroir de `GET /v1/realisations`.
 *
 * **Une réalisation est une affaire réalisée.** Elle ne duplique rien : ville,
 * client, intitulé, montant existent déjà côté affaire, et les recopier ici
 * garantirait qu'un jour les deux divergent. L'article ne porte que la couche
 * éditoriale — le texte, la seule chose que le marketing saisit.
 */

export type ArticleStatus = "a_rediger" | "brouillon" | "a_relire" | "publie";

/** La couche éditoriale. Vide tant que personne n'a écrit. */
export type Article = {
  status: ArticleStatus;
  title: string;
  /** L'adresse de la page publiée, unique quand elle est renseignée. */
  slug: string;
  excerpt: string;
  /** Ce que le client voulait. */
  context: string;
  /** Ce qu'on a fait, techniquement — la partie qui intéresse un prescripteur. */
  solution: string;
  /** Le résultat, et ce qu'il a permis. */
  result: string;
  keywords: string[];
  /** Citation du client, quand un avis a été recueilli. */
  quote: string;
  quote_author: string;
  published_at: string | null;
  updated_at: string | null;
};

export type Realisation = {
  project_id: string;
  label: string;
  city: string;
  customer_id: string;
  customer_name: string;
  started_at: string | null;
  closed_at: string | null;
  /** Chiffré de l'affaire, en chaîne. « 0 » quand aucun devis n'a de montant. */
  amount_ht: string;
  quote_count: number;
  article: Article;
};

/** Une réalisation, augmentée de ce qui se déduit de son article. */
export type ReadRealisation = {
  realisation: Realisation;
  /** Complétude éditoriale, 0-100 : ce qui manque avant de publier. */
  completeness: number;
  missing: string[];
};

export type CityCoverage = {
  city: string;
  published: number;
  total: number;
};
