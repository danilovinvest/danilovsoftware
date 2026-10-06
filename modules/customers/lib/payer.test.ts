import { describe, expect, test } from "bun:test";
import { piecesForPayer } from "./payer";
import type { PaysFor, Quote } from "./types";

const quote = (id: string, project_id: string): Quote => ({ id, project_id }) as Quote;

describe("piecesForPayer", () => {
  test("sans affaire payée pour d'autres, les pièces de la fiche seules", () => {
    const own = [quote("q1", "p1")];
    expect(piecesForPayer({ quotes: own, pays_for: null })).toEqual({ quotes: own, owners: {} });
  });

  test("les pièces des affaires payées suivent, nommées par leur fiche", () => {
    const paysFor: PaysFor = {
      projects: [
        { id: "marot", label: "Ravalement", reference: "2026-0042", stage: "gagne", customer_id: "c", customer_name: "SDC Le Marot" },
      ],
      quotes: [quote("fa1", "marot"), quote("q1", "p1")],
    };
    const { quotes, owners } = piecesForPayer({ quotes: [quote("q1", "p1")], pays_for: paysFor });
    // Une pièce déjà sur la fiche n'est pas proposée deux fois.
    expect(quotes.map((q) => q.id)).toEqual(["q1", "fa1"]);
    expect(owners.fa1).toBe("SDC Le Marot");
  });
});
