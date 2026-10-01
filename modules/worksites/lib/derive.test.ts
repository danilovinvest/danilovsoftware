import { describe, expect, test } from "bun:test";
import { readFixture } from "./test-fixtures";
import type { WorksiteQuote } from "./types";

function quote(over: Partial<WorksiteQuote>): WorksiteQuote {
  return {
    id: "q",
    reference: "DE2026-0001",
    kind: "etude",
    label: "Étude",
    status: "accepte",
    issued_at: null,
    amount_ht: null,
    amount_ttc: null,
    amount_note: "",
    deposit_status: "non_applicable",
    deposit_amount: null,
    deposit_paid_at: null,
    balance_status: "non_applicable",
    balance_paid_at: null,
    drive_url: "",
    drive_name: "",
    issuer: "ompt-structure",
    ...over,
  };
}

describe("the study board column", () => {
  test("no deposit, no production", () => {
    expect(readFixture({ quotes: [quote({ deposit_status: "en_attente" })] }).column).toBe("acompte_attendu");
  });

  test("a study in production sits at its step", () => {
    const paid = [quote({ deposit_status: "recu" })];
    expect(readFixture({ quotes: paid }).column).toBe("calcul");
    expect(readFixture({ quotes: paid, calc_done_at: "2026-09-20" }).column).toBe("plans");
    expect(readFixture({ quotes: paid, final_ready_at: "2026-09-25" }).column).toBe("a_envoyer");
    expect(readFixture({ quotes: paid, plans_sent_at: "2026-09-28" }).column).toBe("rendue");
  });

  test("a report paid before it is written is still in production", () => {
    const paid = [quote({ kind: "attestation", balance_status: "recu" })];
    const read = readFixture({ quotes: paid });
    expect(read.mission).toBe("rapport_attestation");
    expect(read.column).toBe("calcul");
    expect(readFixture({ quotes: paid, report_sent_at: "2026-09-28" }).column).toBe("soldee");
  });

  test("a study marked done stays done, milestones or not", () => {
    const paid = [quote({ kind: "attestation", balance_status: "recu" })];
    expect(readFixture({ quotes: paid, stage: "realise" }).column).toBe("soldee");
  });
});
