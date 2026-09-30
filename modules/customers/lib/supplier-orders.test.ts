import { describe, expect, test } from "bun:test";
import { invoiceDrift, orderCost, orderLate } from "./supplier-orders";

describe("orderCost", () => {
  test("firm orders are the committed cost, quotes stay apart, cancelled ones cost nothing", () => {
    expect(
      orderCost([
        { status: "commande", amount_ht: "1840.50" },
        { status: "livre", amount_ht: "320.10" },
        { status: "devis", amount_ht: "900.00" },
        { status: "annule", amount_ht: "5000.00" },
      ]),
    ).toEqual({ firm: 216060, invoiced: 0, quoted: 90000, unknown: 0 });
  });

  test("a firm order without an amount is counted as unknown, a quote without one is ignored", () => {
    expect(
      orderCost([
        { status: "commande", amount_ht: null },
        { status: "devis", amount_ht: null },
      ]),
    ).toEqual({ firm: 0, invoiced: 0, quoted: 0, unknown: 1 });
  });

  test("sums to the cent without float drift", () => {
    expect(orderCost([
      { status: "commande", amount_ht: "0.10" },
      { status: "commande", amount_ht: "0.20" },
    ]).firm).toBe(30);
  });
});

describe("supplier invoices", () => {
  test("what the supplier invoiced replaces what was ordered, whatever the status", () => {
    expect(
      orderCost([
        { status: "livre", amount_ht: "1840.50", invoiced_amount_ht: "1912.00" },
        { status: "devis", amount_ht: "900.00", invoiced_amount_ht: "950.00" },
        { status: "commande", amount_ht: null, invoiced_amount_ht: "100.00" },
        { status: "annule", amount_ht: "10.00", invoiced_amount_ht: "10.00" },
      ]),
    ).toEqual({ firm: 296200, invoiced: 296200, quoted: 0, unknown: 0 });
  });

  test("the drift is invoiced minus ordered, and unknown when either is missing", () => {
    expect(invoiceDrift({ amount_ht: "1840.50", invoiced_amount_ht: "1912.00" })).toBe(7150);
    expect(invoiceDrift({ amount_ht: "100.00", invoiced_amount_ht: "90.00" })).toBe(-1000);
    expect(invoiceDrift({ amount_ht: null, invoiced_amount_ht: "90.00" })).toBeNull();
    expect(invoiceDrift({ amount_ht: "100.00", invoiced_amount_ht: null })).toBeNull();
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
