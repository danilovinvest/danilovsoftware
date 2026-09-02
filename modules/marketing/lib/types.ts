import type { Worksite } from "@/modules/worksites";

/**
 * Types du module marketing.
 *
 * Un article ne duplique rien du chantier : il ne porte que la couche
 * éditoriale, et pointe vers le chantier par son identifiant. Ville, client,
 * technique, durée, avis — tout cela existe déjà côté chantier, le recopier
 * garantirait qu'un jour les deux divergent.
 */

export type ArticleStatus = "a_rediger" | "brouillon" | "a_relire" | "publie";

export type Photo = {
  id: string;
  /** Étiquette de la photo : le jeu de démonstration n'a pas de fichiers. */
  label: string;
  caption: string;
  kind: "avant" | "pendant" | "apres" | "detail";
};

/** La couche éditoriale, la seule chose que le marketing saisit. */
export type Article = {
  worksite_id: string;
  status: ArticleStatus;
  title: string;
  slug: string;
  excerpt: string;
  /** Ce que le client voulait. */
  context: string;
  /** Ce qu'on a fait, techniquement — la partie qui intéresse un prescripteur. */
  solution: string;
  /** Le résultat, et ce qu'il a permis. */
  result: string;
  keywords: string[];
  photos: Photo[];
  /** Citation du client, quand un avis a été recueilli. */
  quote: string;
  quote_author: string;
  published_at: string | null;
  updated_at: string | null;
};

/** Un chantier livré vu par le marketing : le chantier, plus son article. */
export type Realisation = {
  worksite: Worksite;
  article: Article;
  /** Durée réelle du chantier, en jours. */
  duration: number;
  /** Complétude éditoriale, 0-100 : ce qui manque avant de publier. */
  completeness: number;
  missing: string[];
};

export type CityCoverage = {
  city: string;
  published: number;
  total: number;
};

export type MarketingSnapshot = {
  generated_at: string;
  metrics: import("@/shared/ui/metric-cards").Metric[];
  realisations: Realisation[];
  cities: CityCoverage[];
  /** Nombre de chantiers livrés dont l'avis client n'a jamais été demandé. */
  reviews_missing: number;
};
