import { describe, expect, test } from "bun:test";
import { balanceFact, depositFact, type FactQuote } from "./settlement";

/*
  Les mêmes cas que `settlement_facts_test.go` : la règle est écrite deux fois,
  pour l'écran et pour le connecteur, et les deux tests la tiennent d'accord.
*/

function piece(patch: Partial<FactQuote>): FactQuote {
  return {
    id: crypto.randomUUID(),
    status: "realise",
    issued_at: null,
    piece: "facture",
    invoice_kind: null,
    source_quote_id: null,
    amount_ttc: null,
    deposit_status: "non_applicable",
    deposit_amount: null,
    deposit_paid_at: null,
    balance_status: "non_applicable",
    balance_amount: null,
    balance_paid_at: null,
    ...patch,
  };
}

describe("balanceFact", () => {
  const devis = piece({ piece: "devis", status: "accepte", amount_ttc: "25300.00" });
  const acompte = piece({
    invoice_kind: "acompte",
    source_quote_id: devis.id,
    balance_status: "recu",
    balance_amount: "15000.00",
    balance_paid_at: "2026-02-09",
  });
  const situation = piece({
    invoice_kind: "situation",
    source_quote_id: devis.id,
    balance_status: "recu",
    balance_amount: "5150.00",
    balance_paid_at: "2026-03-19",
  });

  test("Koja : une situation payée ne franchit pas le solde", () => {
    expect(balanceFact([devis, acompte, situation]).done).toBe(false);
  });

  test("payé à 100 %, le solde est franchi au dernier paiement", () => {
    const juste = { ...devis, amount_ttc: "20150.00" };
    const fait = balanceFact([juste, acompte, situation]);
    expect(fait).toEqual({ done: true, at: "2026-03-19", fact: true, markOn: null });
  });

  test("Anisimova : une facture de solde partielle ne solde pas le marché", () => {
    const marche = piece({
      piece: "devis",
      status: "accepte",
      amount_ttc: "19448.40",
      deposit_status: "recu",
      deposit_amount: "9724.20",
      balance_status: "recu",
      balance_amount: "3230.00",
    });
    const quotes = [
      marche,
      piece({ invoice_kind: "acompte", source_quote_id: marche.id, balance_status: "recu", balance_amount: "9724.20" }),
      piece({ invoice_kind: "solde", balance_status: "recu", balance_amount: "1000.00", balance_paid_at: "2025-12-01" }),
    ];
    expect(balanceFact(quotes).done).toBe(false);
  });

  test("sans montants, une pièce soldée le franchit encore, et se retire", () => {
    const solde = piece({ piece: "devis", status: "accepte", balance_status: "recu", balance_paid_at: "2025-06-26" });
    expect(balanceFact([solde])).toEqual({ done: true, at: "2025-06-26", fact: false, markOn: solde.id });
  });

  test("une pièce annulée ne compte pas", () => {
    expect(balanceFact([piece({ status: "annule", balance_status: "recu" })]).done).toBe(false);
  });
});

describe("depositFact", () => {
  const marque = piece({ piece: "devis", status: "accepte", deposit_status: "recu", deposit_paid_at: "2026-01-05" });

  test("une marque seule franchit le cran et se retire sur sa pièce", () => {
    expect(depositFact([marque])).toEqual({ done: true, at: "2026-01-05", fact: false, markOn: marque.id });
  });

  test("le paiement de la facture d'acompte redate le cran et l'emporte", () => {
    const paye = piece({ invoice_kind: "acompte", balance_status: "recu", balance_paid_at: "2026-02-09" });
    expect(depositFact([marque, paye])).toEqual({ done: true, at: "2026-02-09", fact: true, markOn: null });
  });

  test("un acompte attendu n'est pas franchi", () => {
    expect(depositFact([piece({ deposit_status: "en_attente" })]).done).toBe(false);
  });
});
