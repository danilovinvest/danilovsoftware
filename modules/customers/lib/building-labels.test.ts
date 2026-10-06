import { describe, expect, test } from "bun:test";
import { canBeLifted, interventions, orderInForce } from "./building-labels";

describe("orderInForce", () => {
  test("an order still standing is in force", () => {
    expect(orderInForce({ kind: "mise_en_securite", lifted_at: null })).toBe(true);
  });

  test("a lifted order is not", () => {
    expect(orderInForce({ kind: "arrete_peril", lifted_at: "2026-06-30" })).toBe(false);
  });

  test("a report is never an order", () => {
    expect(orderInForce({ kind: "rapport_bet", lifted_at: null })).toBe(false);
    expect(canBeLifted("rapport_bet")).toBe(false);
    expect(canBeLifted("arrete_peril")).toBe(true);
  });
});

describe("interventions", () => {
  const project = (id: string, started_at: string | null, created_at: string) => ({ id, started_at, created_at });

  test("most recent first, by site date then creation date", () => {
    const out = interventions([
      project("old", "2023-05-02T08:00:00Z", "2023-01-01T00:00:00Z"),
      project("imported", null, "2025-03-10T00:00:00Z"),
      project("recent", "2026-02-01T08:00:00Z", "2025-12-01T00:00:00Z"),
    ]);
    expect(out.map((p) => p.id)).toEqual(["recent", "imported", "old"]);
    expect(out.map((p) => p.year)).toEqual([2026, 2025, 2023]);
  });

  test("an unreadable date gives no year", () => {
    expect(interventions([project("x", "pas une date", "2025-01-01")])[0].year).toBeNull();
  });
});
