import type { ParsedFolder } from "./types";

/**
 * Lire un nom de dossier d'affaire.
 *
 * L'entreprise range ses dossiers `PARTAGE / 3. OMPT GROUPE / {année} /
 * {MM-JJ-AAAA}_{client}`, avec le point ou le tiret comme séparateur de date
 * selon l'humeur du jour. Sur les vingt-sept dossiers de 2026, vingt-quatre
 * suivent cette forme ; les trois autres — « 3 rue Danté », « ARAM » — n'ont
 * pas de date et gardent leur nom entier plutôt que d'être écartés.
 *
 * La date est au format américain, mois d'abord : `07.10.2026` est le 10
 * juillet et non le 7 octobre. C'est ce que confirme le recoupement avec les
 * fiches — le dossier `07.10.2026_Urso` correspond à une affaire de juillet.
 */
const DATED = /^(\d{2})[-.](\d{2})[-.](\d{4})[_\s-]+(.*)$/;

export function parseFolder(raw: string): ParsedFolder {
  const trimmed = raw.trim();
  const match = DATED.exec(trimmed);

  const rest = match ? match[4] : trimmed;
  const date = match ? `${match[3]}-${match[1]}-${match[2]}` : "";

  // La parenthèse porte un second nom — le syndic, l'immeuble — qui vaut autant
  // que le premier pour retrouver une fiche.
  const aside = /\(([^)]*)\)/.exec(rest)?.[1]?.trim() ?? "";
  const client = rest.replace(/\s*\([^)]*\)/g, "").trim();

  return { raw: trimmed, client: client || trimmed, aside, date };
}

/** Vrai quand le dossier ressemble à une affaire et non à un dossier de service. */
export function looksLikeDeal(name: string): boolean {
  const upper = name.trim().toUpperCase();
  return !["BIBLIOTHEQUE IMAGES", "MODELES", "ADMIN", "TEMPLATES"].includes(upper);
}
