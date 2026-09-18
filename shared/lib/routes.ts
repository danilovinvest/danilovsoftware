/**
 * Les adresses des écrans qui portent un identifiant.
 *
 * **L'application est un export statique, et un export statique ne connaît pas
 * `/customers/<id>`.** Next ne peut fabriquer à la compilation que les pages
 * dont il connaît les paramètres, et les identifiants vivent en base. La fiche
 * et l'automatisation portent donc leur identifiant en paramètre d'URL — une
 * seule page, lue dans le navigateur, pour toutes les fiches.
 *
 * Une fonction par écran plutôt qu'une chaîne recopiée : la forme a déjà changé
 * une fois, et une quinzaine de liens écrits à la main auraient divergé.
 */

export function customerHref(id: string): string {
  return `/customers/fiche?id=${encodeURIComponent(id)}`;
}

export function automationHref(id: string): string {
  return `/automations/edition?id=${encodeURIComponent(id)}`;
}

const LEGACY = /^\/(customers|automations)\/([0-9a-f-]{36})(?=$|[?#])(.*)$/i;

/**
 * Traduit un chemin de l'ancienne forme vers celle de l'application.
 *
 * L'API sert encore `/customers/<id>` — la recherche transverse fabrique ses
 * liens côté serveur, et le CRM web, qui vit jusqu'à sa coupure, les lit sous
 * cette forme. Plutôt que de faire bifurquer le serveur selon le client, la
 * traduction se fait à l'arrivée. Tout autre chemin passe tel quel.
 */
export function appHref(path: string): string {
  const match = LEGACY.exec(path);
  if (!match) return path;
  const [, section, id, rest] = match;
  const base = section === "customers" ? customerHref(id) : automationHref(id);
  // Un paramètre déjà présent se rattache par « & », une ancre suit telle quelle.
  return rest.startsWith("?") ? `${base}&${rest.slice(1)}` : `${base}${rest}`;
}
