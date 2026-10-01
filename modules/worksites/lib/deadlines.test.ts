import { describe, expect, test } from "bun:test";
import { deadlinesBetween, worksiteMetier } from "./deadlines";
import { worksiteFixture } from "./test-fixtures";

const from = "2026-10-01";
const to = "2026-11-01";
const today = "2026-10-10";

describe("deadlinesBetween", () => {
  test("both dates of a dossier within the period, late ones first", () => {
    const w = worksiteFixture({
      id: "a",
      issuer: "ompt-structure",
      promised_at: "2026-10-20",
      internal_deadline_at: "2026-10-05",
    });
    const out = deadlinesBetween([w], from, to, today);
    expect(out.map((d) => [d.kind, d.day, d.late])).toEqual([
      ["interne", "2026-10-05", true],
      ["promis", "2026-10-20", false],
    ]);
  });

  test("outside the period, nothing", () => {
    const w = worksiteFixture({ promised_at: "2026-11-02" });
    expect(deadlinesBetween([w], from, to, today)).toEqual([]);
  });

  test("a delivered study or a finished worksite no longer speaks", () => {
    const study = worksiteFixture({ issuer: "ompt-structure", promised_at: "2026-10-20", plans_sent_at: "2026-10-01" });
    const done = worksiteFixture({ issuer: "ompt-groupe", promised_at: "2026-10-20", stage: "realise" });
    expect(deadlinesBetween([study, done], from, to, today)).toEqual([]);
  });

  test("a stopped dossier no longer speaks", () => {
    const w = worksiteFixture({ promised_at: "2026-10-20", outcome: "arrete" });
    expect(deadlinesBetween([w], from, to, today)).toEqual([]);
  });
});

test("the métier follows the affaire, then its quotes", () => {
  expect(worksiteMetier(worksiteFixture({ issuer: "ompt-structure" }))).toBe("etudes");
  expect(worksiteMetier(worksiteFixture({}))).toBe("travaux");
});
