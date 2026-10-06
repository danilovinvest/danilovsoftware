import { describe, expect, test } from "bun:test";
import { allocationPlan } from "./allocation";

// La règle de `planAllocation` côté serveur : les mêmes cas, le même verdict.
describe("allocationPlan", () => {
  test("tout affecté", () => {
    const plan = allocationPlan("3500.00", [
      { quoteId: "a", amount: "2 180" },
      { quoteId: "b", amount: "1320,00" },
    ]);
    expect(plan.error).toBeNull();
    expect(plan.remaining).toBe("0.00");
    expect(plan.parts).toEqual([
      { quote_id: "a", amount: "2180" },
      { quote_id: "b", amount: "1320.00" },
    ]);
  });

  test("une part, le reste attend", () => {
    const plan = allocationPlan("3000", [{ quoteId: "a", amount: "2000" }, { quoteId: "b", amount: "" }]);
    expect(plan.error).toBeNull();
    expect(plan.remaining).toBe("1000.00");
    expect(plan.parts).toHaveLength(1);
  });

  test.each([
    ["trop affecté", [{ quoteId: "a", amount: "3000,01" }], "Les parts dépassent l'encaissement."],
    ["aucune part", [{ quoteId: "a", amount: "" }], "Aucune part à affecter."],
    ["illisible", [{ quoteId: "a", amount: "deux mille" }], "Un montant est illisible."],
  ])("%s", (_name, drafts, error) => {
    expect(allocationPlan("3000", drafts).error).toBe(error);
  });
});
