import { describe, expect, test } from "bun:test";
import { orderCost, orderLate } from "./supplier-orders";

describe("orderCost", () => {
  test("firm orders are the committed cost, quotes stay apart, cancelled ones cost nothing", () => {
    expect(
      orderCost([
        { status: "commande", amount_ht: "1840.50" },
        { status: "livre", amount_ht: "320.10" },
        { status: "devis", amount_ht: "900.00" },
        { status: "annule", amount_ht: "5000.00" },
      ]),
    ).toEqual({ firm: 216060, quoted: 90000, unknown: 0 });
  });

  test("a firm order without an amount is counted as unknown, a quote without one is ignored", () => {
    expect(
      orderCost([
        { status: "commande", amount_ht: null },
        { status: "devis", amount_ht: null },
      ]),
    ).toEqual({ firm: 0, quoted: 0, unknown: 1 });
  });

  test("sums to the cent without float drift", () => {
    expect(orderCost([
      { status: "commande", amount_ht: "0.10" },
      { status: "commande", amount_ht: "0.20" },
    ]).firm).toBe(30);
  });
});

describe("orderLate", () => {
  test("only an ordered, undelivered order past its date is late", () => {
    expect(orderLate({ status: "commande", expected_at: "2026-09-15" }, "2026-09-30")).toBe(true);
    expect(orderLate({ status: "commande", expected_at: "2026-10-02" }, "2026-09-30")).toBe(false);
    expect(orderLate({ status: "livre", expected_at: "2026-09-15" }, "2026-09-30")).toBe(false);
    expect(orderLate({ status: "devis", expected_at: "2026-09-15" }, "2026-09-30")).toBe(false);
    expect(orderLate({ status: "commande", expected_at: null }, "2026-09-30")).toBe(false);
  });
});
