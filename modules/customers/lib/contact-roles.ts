import type { CustomerKind } from "./types";

/**
 * Les rôles qu'on propose pour l'interlocuteur d'un tiers (feuille de route du
 * 29/09, phase 4).
 *
 * Chez un fournisseur on n'appelle pas la même personne pour un prix, une
 * facture ou un retrait : le commercial, la comptabilité, le dépôt. Ce ne sont
 * que des raccourcis de saisie — le rôle reste un texte libre, et une fiche de
 * particulier n'en propose aucun.
 */
const ROLES: Partial<Record<CustomerKind, string[]>> = {
  fournisseur: ["Commercial", "Comptabilité", "Dépôt"],
  sous_traitant: ["Gérant", "Chef de chantier", "Comptabilité"],
  syndic: ["Gestionnaire", "Assistante", "Comptabilité"],
  gestionnaire: ["Gestionnaire", "Assistante", "Comptabilité"],
  copropriete: ["Président du conseil syndical", "Gardien", "Copropriétaire"],
};

export function contactRoles(kind: CustomerKind | undefined): string[] {
  return (kind && ROLES[kind]) || [];
}
