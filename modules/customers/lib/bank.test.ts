import { describe, expect, test } from "bun:test";
import { coverageAlerts, suggestionAction, suggestionPayload, sureCount, type BankLine } from "./bank";

describe("suggestionPayload", () => {
  test("a payment already entered is pointed by its group", () => {
    expect(suggestionPayload({ kind: "paiement", sure: true, reason: "…", group_id: "g1" })).toEqual({
      group_id: "g1",
      from_suggestion: true,
    });
  });

  test("an invoice suggestion sends its parts, and nothing else", () => {
    const payload = suggestionPayload({
      kind: "facture",
      sure: true,
      reason: "…",
      allocations: [{ quote_id: "q1", reference: "FA2026-0012", customer: "SDC", amount: "2500.00" }],
    });
    expect(payload).toEqual({ allocations: [{ quote_id: "q1", amount: "2500.00" }], from_suggestion: true });
  });

  test("a reason without anything to write offers no button", () => {
    expect(suggestionPayload({ kind: "", sure: false, reason: "à répartir à la main" })).toBeNull();
    expect(suggestionPayload(undefined)).toBeNull();
    expect(suggestionAction({ kind: "", sure: false, reason: "" })).toBe("");
  });

  test("the button says what will be written", () => {
    expect(suggestionAction({ kind: "facture", sure: false, reason: "", pending: "100.00" })).toBe(
      "Encaisser, le reste en attente",
    );
    expect(suggestionAction({ kind: "fiche", sure: false, reason: "", customer_id: "c1" })).toBe(
      "Mettre en attente sur sa fiche",
    );
  });
});

describe("coverageAlerts", () => {
  test("an account up to date says nothing", () => {
    expect(coverageAlerts({ covered_until: "2026-09-15", gaps: [], late: false })).toEqual([]);
  });

  test("a gap and a late account are two alerts", () => {
    const alerts = coverageAlerts({
      covered_until: "2026-07-31",
      gaps: [{ from: "2026-06-01", to: "2026-06-30" }],
      late: true,
    });
    expect(alerts.map((a) => a.tone)).toEqual(["danger", "warning"]);
    expect(alerts[0].text).toContain("Relevé manquant");
  });

  test("an account never imported says so once", () => {
    const alerts = coverageAlerts({ covered_until: "", gaps: [], late: true });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].text).toBe("Aucun relevé importé");
  });
});

describe("sureCount", () => {
  const line = (suggestion: BankLine["suggestion"]): BankLine => ({
    id: "l",
    bank_account_id: "a",
    account_label: "GROUPE",
    booked_at: "2026-09-12",
    label: "VIR",
    detail: "",
    amount: "100.00",
    status: "a_rapprocher",
    note: "",
    payment_group_id: null,
    matched_by: "",
    decided_at: null,
    decided_by_name: "",
    suggestion,
  });

  test("only sure suggestions that write something count", () => {
    expect(
      sureCount([
        line({ kind: "paiement", sure: true, reason: "", group_id: "g" }),
        line({ kind: "facture", sure: false, reason: "", allocations: [] }),
        line({ kind: "", sure: false, reason: "" }),
        line(undefined),
      ]),
    ).toBe(1);
  });
});
