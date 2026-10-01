import { describe, expect, test } from "bun:test";
import { toInvoice, type ApiInvoice } from "./live";
import { buildBillingSnapshot } from "./snapshot";

const today = "2026-10-01";

function api(over: Partial<ApiInvoice>): ApiInvoice {
  return {
    id: "f",
    reference: "FA2026-0001",
    issuer: "ompt-structure",
    label: "Étude",
    kind: "etude",
    invoice_kind: "",
    issued_at: "2026-09-01",
    due_at: null,
    amount_ht: "1000.00",
    amount_ttc: "1200.00",
    vat_rate: "20",
    net: "1200.00",
    remaining: "1200.00",
    marked_received: false,
    payments: 0,
    customer_id: "c",
    customer_name: "Client",
    project_id: "p",
    ...over,
  };
}

describe("toInvoice", () => {
  test("without a due date an unpaid invoice is never late", () => {
    const invoice = toInvoice(api({}), today);
    expect(invoice.status).toBe("emise");
    expect(invoice.days_late).toBe(0);
  });

  test("past its due date it is late, even half paid", () => {
    const invoice = toInvoice(api({ due_at: "2026-09-21", remaining: "600.00" }), today);
    expect(invoice.status).toBe("retard");
    expect(invoice.days_late).toBe(10);
    expect(invoice.paid_amount).toBe(600);
  });

  test("nothing left to pay is paid", () => {
    expect(toInvoice(api({ remaining: "0" }), today).status).toBe("reglee");
  });

  test("a credit note counts negative and owes nothing", () => {
    const invoice = toInvoice(api({ invoice_kind: "avoir", remaining: "0", net: "0" }), today);
    expect(invoice.status).toBe("avoir");
    expect(invoice.amount_ht).toBe(-1000);
    expect(invoice.amount_vat).toBe(-200);
  });

  test("an invoice without an amount is neither paid nor counted", () => {
    const invoice = toInvoice(api({ amount_ht: null, amount_ttc: null, net: "0", remaining: "0" }), today);
    expect(invoice.status).toBe("emise");
    expect(invoice.unpriced).toBe(true);
  });
});

describe("buildBillingSnapshot", () => {
  const invoices = [
    api({ id: "a", due_at: "2026-08-01", remaining: "1200.00" }),
    api({ id: "b", due_at: "2026-10-20", remaining: "1200.00" }),
    api({ id: "c", remaining: "1200.00", marked_received: true }),
    api({ id: "d", remaining: "0" }),
    api({ id: "e", issued_at: null, remaining: "0" }),
  ].map((item) => toInvoice(item, today));
  const snapshot = buildBillingSnapshot(invoices, "90j", null, today);

  test("the aged balance keeps undated debts apart", () => {
    const amount = (key: string) => snapshot.aged.find((b) => b.key === key)?.amount;
    expect(amount("sans_echeance")).toBe(1200);
    expect(amount("a_echoir")).toBe(1200);
    expect(amount("61_90")).toBe(1200);
  });

  test("what is marked received without a transfer is said apart", () => {
    expect(snapshot.unrecorded).toEqual({ amount: 1200, count: 1 });
  });

  test("an undated invoice is outside every window", () => {
    expect(snapshot.metrics.find((m) => m.key === "billed")?.value).toBe(4000);
  });

  test("no internal flow is invented", () => {
    expect(snapshot.flows).toEqual([]);
  });
});

describe("the HT of an invoice", () => {
  test("is drawn from the TTC by its rate when not entered", () => {
    const invoice = toInvoice(api({ amount_ht: null, amount_ttc: "1100.00", vat_rate: "10" }), today);
    expect(invoice.amount_ht).toBe(1000);
    expect(invoice.amount_vat).toBe(100);
    expect(invoice.ht_unknown).toBe(false);
  });

  test("stays unknown without a rate, and the TTC is not taken for it", () => {
    const invoice = toInvoice(api({ amount_ht: null, vat_rate: null }), today);
    expect(invoice.ht_unknown).toBe(true);
    expect(invoice.amount_ht).toBe(0);
    expect(invoice.amount_vat).toBe(0);
  });
});

describe("the billing windows", () => {
  const invoices = [
    api({ id: "today", issued_at: today }),
    api({ id: "edge", issued_at: "2026-07-03" }), // 90 jours : période précédente
    api({ id: "nottc", amount_ht: null, vat_rate: null, issued_at: "2026-09-15" }),
    api({ id: "orphan", issuer: "", issued_at: "2026-09-20" }),
  ].map((item) => toInvoice(item, today));
  const snapshot = buildBillingSnapshot(invoices, "90j", null, today);
  const billed = snapshot.metrics.find((m) => m.key === "billed");

  test("an invoice issued today counts, the 90th day falls in the previous window", () => {
    expect(billed?.value).toBe(2000);
    expect(billed?.previous).toBe(1000);
  });

  test("an invoice without HT nor rate is said, not summed", () => {
    expect(snapshot.ht_unknown).toBe(1);
    expect(billed?.hint).toContain("1 sans HT ni taux");
  });

  test("an invoice without issuing company is counted apart", () => {
    expect(snapshot.unassigned).toEqual({ count: 1, billed: 1000 });
  });
});
