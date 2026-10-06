import { describe, expect, test } from "bun:test";
import { CUSTOMER_CATEGORIES, categoryFilters, categoryLabels, categoryOf } from "./categories";
import { filtersFromQuery, filtersToQuery, hasCategory } from "./list-query";
import type { CustomerFilters } from "./types";

const DEFAULTS: CustomerFilters = { sort: "name", status: ["client"], page: 1, per_page: 25 };

describe("catégories dans l'adresse", () => {
  test("chaque catégorie fait l'aller-retour par l'adresse", () => {
    for (const category of CUSTOMER_CATEGORIES) {
      const filters = { ...DEFAULTS, ...categoryFilters(category.key) };
      const query = filtersToQuery(filters, DEFAULTS);
      const back = filtersFromQuery(new URLSearchParams(query), DEFAULTS);
      expect(categoryOf(back)).toBe(category.key);
      expect(hasCategory(back)).toBe(true);
    }
  });

  test("une valeur inconnue est ignorée, pas la liste", () => {
    const back = filtersFromQuery(
      new URLSearchParams("type=syndic,martien&relation=inconnue&apporteur=oui"),
      DEFAULTS,
    );
    expect(back.kind).toEqual(["syndic"]);
    expect(back.relation).toBeUndefined();
    expect(back.referrer).toBeUndefined();
  });

  test("choisir une catégorie retire la précédente", () => {
    expect(categoryFilters("apporteurs")).toEqual({
      kind: undefined,
      relation: undefined,
      referrer: true,
    });
    expect(categoryFilters("")).toEqual({ kind: undefined, relation: undefined, referrer: undefined });
  });
});

describe("categoryLabels", () => {
  test("une particulière cliente finale ne porte rien", () => {
    expect(categoryLabels({ kind: "particulier", relation: null, is_referrer: false })).toEqual([]);
  });

  test("un syndic dit son type, pas la relation que le type suppose", () => {
    expect(categoryLabels({ kind: "syndic", relation: null, is_referrer: true })).toEqual([
      { key: "kind", label: "Syndic" },
      { key: "referrer", label: "Apporteur" },
    ]);
    expect(categoryLabels({ kind: "syndic", relation: "prescripteur", is_referrer: false })).toEqual([
      { key: "kind", label: "Syndic" },
    ]);
  });

  test("une relation choisie qui contredit le type se dit", () => {
    expect(
      categoryLabels({ kind: "particulier", relation: "fournisseur", is_referrer: false }),
    ).toEqual([{ key: "relation", label: "Fournisseur" }]);
  });
});
