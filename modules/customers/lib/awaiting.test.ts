import { describe, expect, test } from "bun:test";
import type { AwaitingQuote } from "./awaiting-api";
import { amountAtStake, daysBetween, groupAwaiting, readAwaiting } from "./awaiting";

const today = "2026-10-01";

function quote(over: Partial<AwaitingQuote>): AwaitingQuote {
  return {
    quote_id: "q",
    reference: "DE2026-0001",
    label: "Étude",
    kind: "etude",
    issuer: "ompt-structure",
    issued_at: null,
    amount_ht: null,
    amount_ttc: null,
    customer_id: "c",
    customer_name: "Client",
    archived: false,
    project_id: "p",
    project_label: "Affaire",
    last_relance_at: null,
    last_relance_summary: "",
    relances: 0,
    ...over,
  };
}

describe("daysBetween", () => {
  test("counts whole days from a date or an instant", () => {
    expect(daysBetween(today, "2026-09-01")).toBe(30);
    expect(daysBetween(today, "2026-09-30T22:15:00Z")).toBe(1);
    expect(daysBetween(today, null)).toBeNull();
  });
});

describe("readAwaiting", () => {
  test("a quote sent three weeks ago and never chased is to chase", () => {
    expect(readAwaiting(quote({ issued_at: "2026-09-01" }), today).bucket).toBe("a_relancer");
  });

  test("the client is still reading a recent quote", () => {
    expect(readAwaiting(quote({ issued_at: "2026-09-20" }), today).bucket).toBe("en_attente");
  });

  test("a recent relance resets the clock", () => {
    const read = readAwaiting(
      quote({ issued_at: "2026-08-01", last_relance_at: "2026-09-25T09:00:00Z" }),
      today,
    );
    expect(read.bucket).toBe("en_attente");
    expect(read.sinceRelance).toBe(6);
  });

  test("an old relance does not", () => {
    expect(
      readAwaiting(quote({ issued_at: "2026-07-01", last_relance_at: "2026-08-01T09:00:00Z" }), today)
        .bucket,
    ).toBe("a_relancer");
  });

  test("past six months a quote sleeps, and without a date it is not counted", () => {
    expect(readAwaiting(quote({ issued_at: "2026-02-01" }), today).bucket).toBe("dormant");
    expect(readAwaiting(quote({}), today).bucket).toBe("sans_date");
  });
});

test("groups follow the working order, longest wait first", () => {
  const groups = groupAwaiting(
    [
      quote({ quote_id: "a", issued_at: "2026-09-01" }),
      quote({ quote_id: "b", issued_at: "2026-08-01" }),
      quote({ quote_id: "c" }),
      quote({ quote_id: "d", issued_at: "2026-09-28" }),
    ],
    today,
  );
  expect(groups.map((g) => g.bucket)).toEqual(["a_relancer", "en_attente", "sans_date"]);
  expect(groups[0].reads.map((r) => r.quote.quote_id)).toEqual(["b", "a"]);
});

test("the amount at stake sums TTC, HT when TTC is missing, to the cent", () => {
  const reads = [
    quote({ amount_ttc: "660.10" }),
    quote({ amount_ht: "100.20" }),
    quote({}),
  ].map((q) => readAwaiting(q, today));
  expect(amountAtStake(reads)).toBe(760.3);
});
