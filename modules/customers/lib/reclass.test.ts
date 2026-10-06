import { describe, expect, test } from "bun:test";
import { relationOf } from "./classification";
import { isNoop, reclassPlan } from "./reclass";

describe("reclassPlan", () => {
  test("un fournisseur rangé en particulier se reclasse par son seul type", () => {
    const plan = reclassPlan(
      { kind: "particulier", relation: null },
      { kind: "fournisseur", relation: null },
    );
    expect(plan).toEqual({ kind: "fournisseur", relation: undefined, effective: "fournisseur" });
    expect(isNoop(plan)).toBe(false);
  });

  test("retirer une relation choisie la rend au type", () => {
    const plan = reclassPlan(
      { kind: "syndic", relation: "client_final" },
      { kind: "syndic", relation: null },
    );
    expect(plan.relation).toBeNull();
    expect(plan.effective).toBe("prescripteur");
  });

  test("rien ne change, rien ne s'écrit", () => {
    expect(isNoop(reclassPlan({ kind: "societe", relation: null }, { kind: "societe", relation: null }))).toBe(
      true,
    );
  });
});

describe("relationOf, types de la migration 107", () => {
  test("un gestionnaire prescrit, un organisme intervient", () => {
    expect(relationOf({ kind: "gestionnaire", relation: null })).toEqual({ value: "prescripteur", deduced: true });
    expect(relationOf({ kind: "organisme", relation: null })).toEqual({ value: "intervenant", deduced: true });
  });
});
