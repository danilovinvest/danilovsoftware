import type { CustomerKind, CustomerRelation, CustomerStatus } from "@/modules/customers";

/**
 * Le graphe de toute la base, tel que le sert `GET /v1/customers/graph`.
 *
 * Types miroir de `api/internal/customers/graph_global.go` : les nœuds sont les
 * fiches, et seulement elles — une affaire est un attribut de sa fiche
 * (`projects_count`), pas une relation.
 */
export type GraphNode = {
  id: string;
  name: string;
  reference: string;
  kind: CustomerKind;
  /** La relation choisie à la main, nulle quand le type la laisse deviner. */
  relation: CustomerRelation | null;
  /** Celle qui s'applique : même règle que `relationOf` (classification.ts). */
  relation_effective: CustomerRelation;
  status: CustomerStatus;
  is_client: boolean;
  /** « ompt-groupe », « ompt-structure », « mixte » ou vide. */
  issuer: string;
  city: string;
  projects_count: number;
  /** A apporté une affaire chez un autre, ou recommandé une fiche. */
  is_referrer: boolean;
  archived: boolean;
  /** Le nombre de fiches voisines, tous liens confondus. */
  degree: number;
};

/**
 * Les familles de liens.
 *
 * Explicites : `link:<rôle>` (posé à la main — `source` a pour rôle `target`),
 * `referred_project` (`source` a apporté `weight` affaires à `target`),
 * `referred_customer` (`source` a recommandé `target`).
 *
 * Déduits (`inferred`) : `shared_contact` (une adresse ou un numéro commun),
 * `shared_domain` (un domaine professionnel commun). Sans sens : `source` est
 * seulement le plus petit identifiant.
 */
export type GraphEdgeKind =
  | "link:syndic"
  | "link:architecte"
  | "link:payeur"
  | "referred_project"
  | "referred_customer"
  | "shared_contact"
  | "shared_domain";

export type GraphEdge = {
  /** Stable d'un chargement à l'autre : `<kind>:<source>><target>`. */
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
  inferred: boolean;
  weight: number;
  /** Les interlocuteurs communs, ou le domaine. Vide pour un lien explicite. */
  label: string;
  /**
   * Les identifiants partagés (adresse, numéro, domaine) : de quoi regrouper en
   * étoile un interlocuteur commun à treize fiches plutôt que de tracer la clique.
   */
  via: string[];
};

export type CustomersGraph = {
  generated_at: string;
  /** L'empreinte de la base au moment de la lecture. */
  version: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};
