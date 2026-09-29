import { describe, expect, test } from "bun:test";
import {
  canIssueCreditNote,
  cancelledInvoice,
  creditedCents,
  fromCents,
  netToPay,
  type CreditQuote,
} from "./credit-notes";

const facture: CreditQuote = {
  id: "fa",
  piece: "facture",
  invoice_kind: null,
  status: "realise",
  source_quote_id: null,
  amount_ttc: "9724.20",
};

function avoir(ttc: string, status = "realise", source = "fa"): CreditQuote {
  return { id: `av-${ttc}-${status}`, piece: "facture", invoice_kind: "avoir", status, source_quote_id: source, amount_ttc: ttc };
}

// La règle de `net_a_payer` : les deux côtés doivent dire le même net.
describe("netToPay", () => {
  test.each([
    ["sans avoir", [], "9724.20"],
    ["un avoir partiel", [avoir("1000")], "8724.20"],
    ["un avoir stocké négatif compte pareil", [avoir("-1000")], "8724.20"],
    ["annulée en entier", [avoir("9724.20")], "0.00"],
    ["un avoir annulé ne compte pas", [avoir("1000", "annule")], "9724.20"],
    ["l'avoir d'une autre facture non plus", [avoir("1000", "realise", "autre")], "9724.20"],
  ])("%s", (_name, avoirs, want) => {
    expect(netToPay(facture, [facture, ...avoirs])).toBe(want);
  });

  test("sans TTC, le net est inconnu", () => {
    expect(netToPay({ ...facture, amount_ttc: null }, [])).toBeNull();
  });

  test("les avoirs se somment en valeur absolue", () => {
    expect(creditedCents(facture, [avoir("100"), avoir("-50.5")])).toBe(15050);
  });
});

describe("canIssueCreditNote", () => {
  test("une facture vivante, et elle seule", () => {
    expect(canIssueCreditNote(facture)).toBe(true);
    expect(canIssueCreditNote({ ...facture, piece: "devis" })).toBe(false);
    expect(canIssueCreditNote({ ...facture, status: "annule" })).toBe(false);
    expect(canIssueCreditNote(avoir("10"))).toBe(false);
  });
});

test("un avoir nomme la facture qu'il annule", () => {
  expect(cancelledInvoice(avoir("10"), [facture])?.id).toBe("fa");
  expect(cancelledInvoice(facture, [facture])).toBeNull();
});

test("fromCents", () => {
  expect(fromCents(123405)).toBe("1234.05");
  expect(fromCents(-5)).toBe("-0.05");
});
