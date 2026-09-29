import { relationOf } from "./classification";
import { CUSTOMER_KIND, CUSTOMER_RELATION } from "./labels";
import type { CustomerFilters, CustomerKind, CustomerRelation } from "./types";

/**
 * Les catégories de fiches : ce qui distingue un syndic d'un fournisseur ou
 * d'un apporteur d'affaires.
 *
 * « Dans les fiches client je veux pouvoir différencier les syndics, les
 * fournisseurs, les apporteurs d'affaires » — demandé le 29/09. Trois axes le
 * permettaient déjà (le type, la relation, les affaires apportées) ; il
 * manquait de pouvoir les demander. Chaque catégorie est un **filtre** de la
 * liste, pas une donnée de plus : aucune colonne, aucune seconde vérité.
 *
 * Les mêmes entrées vivent dans la barre latérale (`shell/lib/navigation.ts`),
 * écrites en adresses : un test vérifie qu'elles s'y lisent pareil.
 *
 * Les prescripteurs se lisent sur la relation **effective** : un architecte que
 * personne n'a classé est un prescripteur, un ingénieur un partenaire
 * technique, et c'est ce qu'on cherche sous ce mot.
 */
export type CustomerCategory = {
  key: string;
  label: string;
  filters: Pick<CustomerFilters, "kind" | "relation" | "referrer">;
};

export const CUSTOMER_CATEGORIES: CustomerCategory[] = [
  { key: "coproprietes", label: "Copropriétés", filters: { kind: ["copropriete"] } },
  { key: "syndics", label: "Syndics", filters: { kind: ["syndic"] } },
  {
    key: "prescripteurs",
    label: "Prescripteurs",
    filters: { relation: ["prescripteur", "partenaire_technique"] },
  },
  { key: "apporteurs", label: "Apporteurs d'affaires", filters: { referrer: true } },
  { key: "fournisseurs", label: "Fournisseurs", filters: { relation: ["fournisseur"] } },
  { key: "sous_traitants", label: "Sous-traitants", filters: { relation: ["sous_traitant"] } },
];

/** La catégorie que les filtres désignent exactement, ou `""`. */
export function categoryOf(filters: CustomerFilters): string {
  const same = (a?: string[], b?: string[]) => (a ?? []).join() === (b ?? []).join();
  return (
    CUSTOMER_CATEGORIES.find(
      (c) =>
        same(filters.kind, c.filters.kind) &&
        same(filters.relation, c.filters.relation) &&
        Boolean(filters.referrer) === Boolean(c.filters.referrer),
    )?.key ?? ""
  );
}

/** Les filtres d'une catégorie, les autres catégories retirées. */
export function categoryFilters(key: string): Pick<CustomerFilters, "kind" | "relation" | "referrer"> {
  const category = CUSTOMER_CATEGORIES.find((c) => c.key === key);
  return {
    kind: category?.filters.kind,
    relation: category?.filters.relation,
    referrer: category?.filters.referrer,
  };
}

/**
 * Les étiquettes d'une ligne de la liste : le type, la relation effective,
 * « Apporteur ».
 *
 * Seul ce qui **distingue** s'affiche. Neuf fiches sur dix sont des
 * particuliers clients finaux : leur répéter « Particulier · Client final »
 * noierait les quarante qui ne le sont pas, et ce sont elles qu'on cherche.
 * La relation n'est dite que si elle n'est pas celle du type : « Syndic ·
 * Prescripteur » ne dit rien de plus que « Syndic », « Particulier ·
 * Fournisseur » si.
 */
export function categoryLabels(customer: {
  kind: CustomerKind;
  relation: CustomerRelation | null;
  is_referrer: boolean;
}): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = [];
  if (customer.kind !== "particulier") {
    out.push({ key: "kind", label: CUSTOMER_KIND[customer.kind]?.label ?? customer.kind });
  }
  // La relation choisie ne se dit que si elle contredit le type : une relation
  // déduite, ou choisie égale à celle du type, ne dirait rien de plus.
  const relation = relationOf(customer).value;
  if (relation !== relationOf({ kind: customer.kind, relation: null }).value) {
    out.push({ key: "relation", label: CUSTOMER_RELATION[relation]?.label ?? relation });
  }
  if (customer.is_referrer) out.push({ key: "referrer", label: "Apporteur" });
  return out;
}
