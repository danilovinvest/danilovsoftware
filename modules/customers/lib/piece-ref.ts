/**
 * La lettre de la société devant un numéro de pièce : G ou S (29/09).
 *
 * Chaque société numérote de son côté, et treize numéros DE/FA existent chez les
 * deux. `DE2026-0016` seul ne dit pas de quelle pièce on parle ; « G · DE2026-0016 »
 * le dit. La même lettre préfixe les résultats de la recherche (`pieceTitle`
 * côté serveur) : on tape un numéro, on voit les deux pièces, et laquelle est
 * laquelle.
 *
 * Module pur : la ligne d'un devis, les preuves de la frise et les chantiers
 * l'importent tous.
 */

export type IssuerLetter = "G" | "S";

export function issuerLetter(issuer: string | null | undefined): IssuerLetter | null {
  if (issuer === "ompt-groupe") return "G";
  if (issuer === "ompt-structure") return "S";
  return null;
}

/** Le nom long, pour l'infobulle de la lettre. */
export function issuerName(issuer: string | null | undefined): string | null {
  const letter = issuerLetter(issuer);
  if (letter === "G") return "OMPT GROUPE";
  if (letter === "S") return "OMPT STRUCTURE";
  return null;
}

/** « G · DE2026-0016 » en texte, là où un composant ne s'insère pas. */
export function pieceRefText(issuer: string | null | undefined, reference: string): string {
  const letter = issuerLetter(issuer);
  return letter && reference ? `${letter} · ${reference}` : reference;
}
