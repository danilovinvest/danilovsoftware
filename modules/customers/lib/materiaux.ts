/**
 * Les familles de matériaux proposées à la saisie.
 *
 * **Mesurées, jamais imaginées.** Le comptage des intitulés réels — 526 devis
 * et 509 affaires — donne : « structure métallique » 333 fois, « plancher »
 * 133, « béton » 20, « acier » 17, « climatisation » 10, « étai » 7,
 * « linteau » 4, « parpaing » 2. C'est ce comptage qui donne la liste et son
 * ordre, et c'est pourquoi on n'y trouve ni bois de charpente ni vitrage :
 * cette entreprise ouvre des murs porteurs et reprend des planchers.
 *
 * **Ce ne sont que des raccourcis.** Ils n'enferment rien : ce qui compte dans
 * une commande d'acier est la section et la quantité — « 3 IPE 200 · 4,20 m » —
 * et c'est la saisie libre qui les porte. Une famille cochée vaut exactement
 * une ligne tapée à la main, et rien dans la base ne les distingue.
 */
export const MATERIAL_FAMILIES = [
  "Profilés métalliques (IPE, HEA)",
  "Plancher (poutrelles, hourdis)",
  "Béton",
  "Étais et madriers",
  "Linteaux et maçonnerie",
  "Climatisation et gaines",
] as const;

/**
 * « 3 » et « IPE 200 · 4,20 m » deviennent « 3 × IPE 200 · 4,20 m ».
 *
 * La quantité n'a pas de colonne à elle, et n'en veut pas : ce qu'on commande
 * se compte en pièces, en mètres cubes ou en palettes selon le matériau, et
 * un nombre nu obligerait à tenir une unité à côté — donc à en choisir la
 * liste, qu'aucune donnée du CRM ne porte. Elle est libre, elle vit dans le
 * texte, et le « × » la sépare sans ambiguïté de ce qu'elle compte.
 *
 * Sans quantité, la désignation seule : on ne sait pas toujours combien, et
 * « 0 × Béton » serait faux là où « Béton » est juste.
 */
export function joinMaterial(quantity: string, label: string): string {
  const q = cleanMaterial(quantity);
  const l = cleanMaterial(label);
  if (l === "") return "";
  return q === "" ? l : `${q} × ${l}`;
}

/** Un matériau tel qu'il entre en base : espaces réduits, bords coupés. */
export function cleanMaterial(raw: string): string {
  return raw.trim().split(/\s+/).join(" ");
}

/**
 * Ajoute un matériau à la liste, sans doublon.
 *
 * La comparaison ignore la casse : « Béton » et « béton » sont le même sac de
 * ciment, et l'API refuserait le second de toute façon — mieux vaut que
 * l'écran ne le propose pas que de le faire rejeter.
 */
export function withMaterial(list: string[], raw: string): string[] {
  const item = cleanMaterial(raw);
  if (item === "") return list;
  const key = item.toLowerCase();
  if (list.some((entry) => entry.toLowerCase() === key)) return list;
  return [...list, item];
}

export function withoutMaterial(list: string[], item: string): string[] {
  const key = item.toLowerCase();
  return list.filter((entry) => entry.toLowerCase() !== key);
}

/*
  Les deux plafonds que l'API applique — et qu'elle **refuse** au lieu de
  tronquer, parce qu'une commande silencieusement coupée serait pire qu'un
  refus. L'écran les tient donc à la saisie : la route remplace la ligne
  entière, et un seul matériau trop long ferait rejeter toute l'écriture.
*/
export const MATERIALS_MAX = 40;
export const MATERIAL_LENGTH_MAX = 120;
