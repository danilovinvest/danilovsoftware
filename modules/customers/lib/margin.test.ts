import { describe, expect, test } from "bun:test";
import { projectMargin } from "./margin";

const cost = (firm: number, unknown = 0) => ({ firm, invoiced: 0, quoted: 0, unknown });

describe("projectMargin", () => {
  test("the market is the accepted quotes, excluding taxes, never an invoice", () => {
    const margin = projectMargin(
      [
        { reference: "DE2026-0048", status: "accepte", amount_ht: "10000.00" },
        { reference: "DE2026-0049", status: "envoye", amount_ht: "4000.00" },
        { reference: "FA2026-0010", status: "realise", amount_ht: "3000.00" },
      ],
      "2500.00",
      cost(184050),
    );
    expect(margin).toEqual({
      market: 1000000,
      signed: true,
      subcontracting: 250000,
      material: 184050,
      margin: 565950,
      rate: 57,
      blind: { quotes: 0, orders: 0 },
    });
  });

  test("without an accepted quote, what is proposed counts, refused and cancelled never", () => {
    const margin = projectMargin(
      [
        { reference: "DE2026-0001", status: "envoye", amount_ht: "2000.00" },
        { reference: "DE2026-0002", status: "refuse", amount_ht: "9000.00" },
        { reference: "DE2026-0003", status: "annule", amount_ht: "9000.00" },
      ],
      null,
      cost(50000),
    );
    expect(margin?.market).toBe(200000);
    expect(margin?.signed).toBe(false);
    expect(margin?.margin).toBe(150000);
  });

  test("a loss is a negative margin", () => {
    const margin = projectMargin([{ reference: "DE1", status: "accepte", amount_ht: "1000.00" }], "800.00", cost(40000));
    expect(margin?.margin).toBe(-20000);
    expect(margin?.rate).toBe(-20);
  });

  test("nothing to compute without a priced quote or without any spending", () => {
    expect(projectMargin([{ reference: "DE1", status: "accepte", amount_ht: null }], "800.00", cost(0))).toBeNull();
    expect(projectMargin([{ reference: "DE1", status: "accepte", amount_ht: "1000.00" }], null, cost(0))).toBeNull();
  });

  test("it says what it ignores", () => {
    const margin = projectMargin(
      [
        { reference: "DE1", status: "accepte", amount_ht: "1000.00" },
        { reference: "DE2", status: "accepte", amount_ht: null },
      ],
      null,
      cost(10000, 2),
    );
    expect(margin?.blind).toEqual({ quotes: 1, orders: 2 });
  });
});
