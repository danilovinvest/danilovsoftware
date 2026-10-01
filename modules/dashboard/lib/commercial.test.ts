import { expect, test } from "bun:test";
import type { AwaitingQuotes, SalesMonth } from "@/modules/customers";
import { commercialMetrics } from "./commercial";

function month(m: string, over: Partial<SalesMonth> = {}): SalesMonth {
  return {
    month: m, issued: 0, issued_amount: "0", signed: 0, signed_amount: "0",
    refused: 0, pending: 0, unpriced: 0, ...over,
  };
}

const months = Array.from({ length: 12 }, (_, i) => month(`2026-${String(i + 1).padStart(2, "0")}`));
months[11] = month("2026-12", { issued: 4, signed: 2, signed_amount: "1000.50" });
months[7] = month("2026-08", { issued: 6, signed: 1, signed_amount: "300" });

test("the short window is the last three months, compared with the three before", () => {
  const metrics = commercialMetrics({ months, undated: 0 }, null);
  const signed = metrics.find((m) => m.key === "signed");
  expect(signed?.value).toBe(1000.5);
  expect(signed?.previous).toBe(300);
  expect(metrics.find((m) => m.key === "conversion")?.value).toBe(30);
});

test("pending leaves archived files out, and says when it was not read", () => {
  const awaiting: AwaitingQuotes = {
    today: "2026-12-01",
    items: [
      { amount_ttc: "100.00", amount_ht: null, archived: false },
      { amount_ttc: null, amount_ht: "50.00", archived: false },
      { amount_ttc: "999.00", amount_ht: null, archived: true },
    ].map((q, i) => ({
      quote_id: String(i), reference: "", label: "", kind: "etude", issuer: "", issued_at: null,
      customer_id: "c", customer_name: "C", project_id: "p", project_label: "",
      last_relance_at: null, last_relance_summary: "", relances: 0, ...q,
    })),
  };
  expect(commercialMetrics({ months, undated: 0 }, awaiting).find((m) => m.key === "pending")?.value).toBe(150);
  expect(commercialMetrics({ months, undated: 0 }, null).find((m) => m.key === "pending")?.note).toBe("Non lu");
});
