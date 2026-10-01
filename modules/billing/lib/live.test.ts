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
