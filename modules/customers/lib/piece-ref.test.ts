import { describe, expect, test } from "bun:test";
import { issuerLetter, pieceRefText } from "./piece-ref";
import { settledKinds } from "./settlement";

// La même lettre que `pieceTitle` côté serveur, qui titre les résultats de la
// recherche : les deux doivent dire G et S aux mêmes sociétés.
describe("pieceRefText", () => {
  test.each([
    ["ompt-groupe", "DE2026-0016", "G · DE2026-0016"],
    ["ompt-structure", "DE2026-0016", "S · DE2026-0016"],
    [null, "DE2026-0016", "DE2026-0016"],
    ["ompt-groupe", "", ""],
  ])("%s %s", (issuer, reference, want) => {
    expect(pieceRefText(issuer, reference)).toBe(want);
  });

  test("une société inconnue n'a pas de lettre", () => {
    expect(issuerLetter("autre")).toBeNull();
  });
});

describe("settledKinds", () => {
  test("seuls les règlements présents se corrigent sur la pièce", () => {
    const base = { status: "accepte", issued_at: null };
    expect(settledKinds({ ...base, deposit_status: "recu", balance_status: "recu" })).toEqual([
      "acompte",
      "solde",
    ]);
    expect(
      settledKinds({ ...base, deposit_status: "non_applicable", balance_status: "en_attente" }),
    ).toEqual(["solde"]);
  });
});
