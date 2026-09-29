import type { CustomerFilters, CustomerSource, CustomerStatus } from "./types";
import { CUSTOMER_KIND, CUSTOMER_RELATION } from "./labels";

/**
 * Les filtres de la liste des fiches, dans l'adresse.
 *
 * Ils vivaient dans l'état du composant : « À relancer, page 3 » → une fiche →
 * « Retour aux fiches » rendait « Clients, page 1 », des dizaines de fois par
 * jour. L'adresse les garde, le bouton Précédent du navigateur aussi, et un
 * lien vers une liste filtrée se partage.
 *
 * Seul ce qui s'écarte du défaut s'écrit : une liste qu'on n'a pas filtrée garde
 * l'adresse `/customers`. Module pur, sans React.
 */

const STATUSES: CustomerStatus[] = ["prospect", "client", "perdu", "archive"];
const SORTS = ["recent", "name", "updated", "requested", "amount"] as const;

/** Tous les statuts cochés à la main : distinct du défaut, qui n'en coche qu'un. */
const TOUS = "tous";

export function filtersToQuery(filters: CustomerFilters, defaults: CustomerFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.cycle) params.set("cycle", filters.cycle);
  if (filters.review) params.set("relecture", filters.review);
  if (filters.issuer) params.set("societe", filters.issuer);
  if (filters.status?.join() !== defaults.status?.join()) {
    params.set("statut", filters.status?.length ? filters.status.join(",") : TOUS);
  }
  if (filters.source?.length) params.set("source", filters.source.join(","));
  if (filters.kind?.length) params.set("type", filters.kind.join(","));
  if (filters.relation?.length) params.set("relation", filters.relation.join(","));
  if (filters.referrer) params.set("apporteur", "1");
  if (filters.city) params.set("ville", filters.city);
  if (filters.owner_id) params.set("responsable", filters.owner_id);
  if (filters.sort && filters.sort !== defaults.sort) params.set("tri", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

/** L'inverse, en ignorant ce qu'on ne reconnaît pas plutôt que de casser la liste. */
export function filtersFromQuery(
  params: { get(name: string): string | null },
  defaults: CustomerFilters,
): CustomerFilters {
  const out: CustomerFilters = { ...defaults };
  const q = params.get("q");
  if (q) out.search = q;
  const cycle = params.get("cycle");
  if (cycle) out.cycle = cycle;
  const review = params.get("relecture");
  if (review) out.review = review;
  const issuer = params.get("societe");
  if (issuer) out.issuer = issuer;

  const statut = params.get("statut");
  if (statut === TOUS) out.status = undefined;
  else if (statut) {
    const known = statut.split(",").filter((s): s is CustomerStatus =>
      STATUSES.includes(s as CustomerStatus),
    );
    if (known.length > 0) out.status = known;
  }

  const source = params.get("source");
  if (source) out.source = source.split(",").filter(Boolean) as CustomerSource[];
  const kinds = known(params.get("type"), CUSTOMER_KIND);
  if (kinds.length > 0) out.kind = kinds;
  const relations = known(params.get("relation"), CUSTOMER_RELATION);
  if (relations.length > 0) out.relation = relations;
  if (params.get("apporteur") === "1") out.referrer = true;
  const city = params.get("ville");
  if (city) out.city = city;
  const owner = params.get("responsable");
  if (owner) out.owner_id = owner;
  const tri = params.get("tri");
  if (tri && (SORTS as readonly string[]).includes(tri)) out.sort = tri as CustomerFilters["sort"];
  const page = Number(params.get("page"));
  if (Number.isInteger(page) && page > 1) out.page = page;
  return out;
}

/** Les valeurs d'une liste « a,b » que l'énumération connaît, les autres ignorées. */
function known<T extends string>(raw: string | null, entries: Record<T, unknown>): T[] {
  if (!raw) return [];
  return raw.split(",").filter((value): value is T => Object.hasOwn(entries, value));
}

/**
 * Une catégorie est-elle posée ? Type, relation ou apporteur : ce que la barre
 * latérale propose sous « Fiches client ».
 */
export function hasCategory(filters: CustomerFilters): boolean {
  return Boolean(filters.kind?.length || filters.relation?.length || filters.referrer);
}

/*
  La dernière liste consultée, pour « Retour aux fiches ».

  Lue au clic, jamais au rendu : `sessionStorage` n'existe pas côté serveur, et
  l'adresse du lien différerait entre les deux rendus.
*/
const LAST_KEY = "crm:customers:last-query";

export function rememberListQuery(query: string): void {
  try {
    sessionStorage.setItem(LAST_KEY, query);
  } catch {
    // Stockage refusé (navigation privée) : le retour ramène la liste par défaut.
  }
}

export function lastListHref(): string {
  try {
    const query = sessionStorage.getItem(LAST_KEY);
    return query ? `/customers?${query}` : "/customers";
  } catch {
    return "/customers";
  }
}
