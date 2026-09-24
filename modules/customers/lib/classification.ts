import type { Customer, CustomerKind, CustomerRelation } from "./types";

/**
 * Les trois axes d'une fiche : qui c'est (le type), ce qu'il représente pour
 * nous (la relation), où en est-on (le statut).
 *
 * Module pur : la vue graphe, l'onglet Détails et l'en-tête lisent la même
 * déduction. Deux copies diraient « prescripteur » ici et « client final » là.
 */

/**
 * Ce que le type laisse supposer, tant que personne n'a tranché.
 *
 * Un syndic, un architecte, un notaire ou un maître d'œuvre nous amènent des
 * clients. Un ingénieur travaille avec nous. Le reste est, jusqu'à preuve du
 * contraire, un client — c'est ce qu'était toute fiche avant la migration 82.
 */
const RELATION_BY_KIND: Record<CustomerKind, CustomerRelation> = {
  particulier: "client_final",
  societe: "client_final",
  copropriete: "client_final",
  autre: "client_final",
  syndic: "prescripteur",
  architecte: "prescripteur",
  maitre_oeuvre: "prescripteur",
  notaire: "prescripteur",
  ingenieur: "partenaire_technique",
  fournisseur: "fournisseur",
  sous_traitant: "sous_traitant",
};

/**
 * La relation qui s'applique, et si elle a été choisie ou déduite.
 *
 * `deduced` est ce qui permet à l'écran de l'écrire en gris : une supposition
 * affichée comme un fait se relit comme un fait.
 */
export function relationOf(customer: Pick<Customer, "kind" | "relation">): {
  value: CustomerRelation;
  deduced: boolean;
} {
  if (customer.relation) return { value: customer.relation, deduced: false };
  return { value: RELATION_BY_KIND[customer.kind] ?? "client_final", deduced: true };
}

/**
 * Une personne morale a un SIRET et une raison sociale ; un particulier non.
 *
 * « Autre » en est exempté aussi : on ne réclame pas un numéro à une fiche dont
 * on ne sait pas ce qu'elle est.
 */
export function isLegalEntity(kind: CustomerKind): boolean {
  return kind !== "particulier" && kind !== "autre";
}

/** Les champs qui manquent à une fiche, dans l'ordre où on les demande. */
export function missingFields(
  customer: Pick<Customer, "kind" | "siret" | "company_name">,
): string[] {
  if (!isLegalEntity(customer.kind)) return [];
  const missing: string[] = [];
  if (!customer.siret) missing.push("SIRET");
  if (!customer.company_name.trim()) missing.push("Raison sociale");
  return missing;
}

/** Un SIRET à l'écran, par groupes : « 123 456 789 00012 ». */
export function formatSiret(siret: string): string {
  if (!/^\d{14}$/.test(siret)) return siret;
  return `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)} ${siret.slice(9)}`;
}
