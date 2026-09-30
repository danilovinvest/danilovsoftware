import { describe, expect, test } from "bun:test";
import { changedRules, nextDunningStage, periodText, rulesEmpty } from "./syndic-labels";
import { EMPTY_RULES } from "./syndic-types";

describe("nextDunningStage", () => {
  test("starts with the plain reminder", () => {
    expect(nextDunningStage([])).toBe("courriel");
  });

  test("follows the highest step taken, whatever the order of entry", () => {
    expect(nextDunningStage(["huissier", "courriel"])).toBe("assignation");
  });

  test("stays on the last step once the ladder is climbed", () => {
    expect(nextDunningStage(["decision"])).toBe("decision");
  });
});

describe("changedRules", () => {
  test("sends only what differs, trimmed", () => {
    const saved = { ...EMPTY_RULES, statement_label: "SDC MAROT" };
    const draft = { ...saved, billing_email: " facturation.agefim@oxia.fr " };
    expect(changedRules(saved, draft)).toEqual({ billing_email: "facturation.agefim@oxia.fr" });
  });

  test("an emptied field is sent empty, which clears it", () => {
    const saved = { ...EMPTY_RULES, portal_reference: "7121447" };
    expect(changedRules(saved, { ...saved, portal_reference: "" })).toEqual({ portal_reference: "" });
  });

  test("nothing changed sends nothing", () => {
    expect(changedRules(EMPTY_RULES, { ...EMPTY_RULES })).toEqual({});
  });
});

test("rulesEmpty tells blank rules from filled ones", () => {
  expect(rulesEmpty(EMPTY_RULES)).toBe(true);
  expect(rulesEmpty({ ...EMPTY_RULES, note: "Facturer au trimestre" })).toBe(false);
});

describe("periodText", () => {
  const format = (day: string | null) => day ?? "";

  test("says both bounds, one, or nothing", () => {
    expect(periodText({ started_at: "2019-01-01", ended_at: "2023-06-30" }, format)).toBe(
      "du 2019-01-01 au 2023-06-30",
    );
    expect(periodText({ started_at: "2019-01-01", ended_at: null }, format)).toBe("depuis le 2019-01-01");
    expect(periodText({ started_at: null, ended_at: "2023-06-30" }, format)).toBe("jusqu'au 2023-06-30");
    expect(periodText({ started_at: null, ended_at: null }, format)).toBe("");
  });
});
