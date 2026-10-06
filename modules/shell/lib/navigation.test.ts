import { describe, expect, test } from "bun:test";
import { NAVIGATION, isSubItemActive } from "./navigation";
import { CUSTOMER_CATEGORIES, categoryOf } from "@/modules/customers/lib/categories";
import { filtersFromQuery } from "@/modules/customers/lib/list-query";

const fiches = NAVIGATION.find((item) => item.href === "/customers")?.items ?? [];

function activeFor(url: string): string[] {
  const at = new URL(url, "http://crm.local");
  return fiches
    .filter((sub) => isSubItemActive(sub.href, fiches, at.pathname, at.searchParams))
    .map((sub) => sub.label);
}

describe("sous-entrées des fiches", () => {
  test("une seule entrée active par liste", () => {
    expect(activeFor("/customers")).toEqual(["Clients"]);
    expect(activeFor("/customers?statut=tous")).toEqual(["Toutes"]);
    expect(activeFor("/customers?type=syndic&q=cabinet&page=2")).toEqual(["Syndics"]);
    // L'adresse écrite par la liste encode la virgule : elle se lit pareil.
    expect(activeFor("/customers?relation=prescripteur%2Cpartenaire_technique")).toEqual([
      "Prescripteurs",
    ]);
    expect(activeFor("/customers/graphe")).toEqual(["Graphe"]);
  });

  test("une fiche ouverte n'allume aucune sous-entrée", () => {
    expect(activeFor("/customers/7419530d-fbb2-4937-aaf5-2403b315f71b")).toEqual([]);
  });

  test("chaque catégorie de la liste a son entrée, et elle s'y lit pareil", () => {
    const defaults = { status: ["client" as const] };
    const keys = fiches
      .map((sub) => new URL(sub.href, "http://crm.local"))
      .filter((url) => url.pathname === "/customers")
      .map((url) => categoryOf(filtersFromQuery(url.searchParams, defaults)))
      .filter(Boolean);
    expect(keys).toEqual(CUSTOMER_CATEGORIES.map((category) => category.key));
  });

  test("sans paramètre chez les sœurs, le chemin seul décide", () => {
    const billing = [{ href: "/billing" }, { href: "/billing/tresorerie" }];
    const none = { get: () => null };
    expect(isSubItemActive("/billing", billing, "/billing", none)).toBe(true);
    expect(isSubItemActive("/billing", billing, "/billing/tresorerie", none)).toBe(false);
  });
});
