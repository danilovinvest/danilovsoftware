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

export function hasMaterial(list: string[], item: string): boolean {
  const key = item.toLowerCase();
  return list.some((entry) => entry.toLowerCase() === key);
}

/** Le plafond que l'API applique : l'écran le dit avant d'être refusé. */
export const MATERIALS_MAX = 40;
