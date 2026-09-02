/**
 * Libellés français des ressources visées par les permissions.
 *
 * Le catalogue des permissions vient du serveur — slug, ressource, action et
 * description — et la description y est déjà en français. Seul le regroupement
 * par ressource a besoin d'un titre lisible, et une ressource inconnue
 * s'affiche telle quelle plutôt que de faire disparaître ses permissions.
 */
export const RESOURCE_LABEL: Record<string, string> = {
  customers: "Fiches client",
  quotes: "Devis",
  tasks: "Tâches",
  imports: "Synchronisation Excel",
  users: "Comptes",
  roles: "Rôles et permissions",
  teams: "Équipes",
  system: "Système",
};

/** Ordre d'affichage : le métier d'abord, l'administration ensuite. */
export const RESOURCE_ORDER = [
  "customers",
  "quotes",
  "tasks",
  "imports",
  "users",
  "roles",
  "teams",
  "system",
];

export function resourceLabel(resource: string): string {
  return RESOURCE_LABEL[resource] ?? resource;
}

export function resourceRank(resource: string): number {
  const index = RESOURCE_ORDER.indexOf(resource);
  return index === -1 ? RESOURCE_ORDER.length : index;
}
