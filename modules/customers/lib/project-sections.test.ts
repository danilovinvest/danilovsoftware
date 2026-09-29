import { describe, expect, test } from "bun:test";
import { EMPTY_JALONS, jalonOrder } from "./jalons";
import { defaultSection, jalonProgress, sectionFromParam } from "./project-sections";
import type { SettlementQuote } from "./settlement";

const quote = (over: Partial<SettlementQuote> = {}): SettlementQuote => ({
  status: "envoye",
  issued_at: "2026-09-01",
  deposit_status: "non_applicable",
  balance_status: "non_applicable",
  ...over,
});

describe("sectionFromParam", () => {
  test("les anciens onglets gardent leur sens", () => {
    expect(sectionFromParam("devis")).toBe("devis");
    expect(sectionFromParam("apres")).toBe("apres");
    expect(sectionFromParam("chronologie")).toBe("chronologie");
    expect(sectionFromParam("chrono")).toBe("chronologie");
  });

  test("absent ou inconnu ne désigne rien", () => {
    expect(sectionFromParam(null)).toBeNull();
    expect(sectionFromParam("")).toBeNull();
    expect(sectionFromParam("graphe")).toBeNull();
  });
});

describe("defaultSection", () => {
  test("sans devis, ou sans devis signé : les devis", () => {
    expect(defaultSection([])).toBe("devis");
    expect(defaultSection([quote()])).toBe("devis");
    expect(defaultSection([quote({ status: "refuse" })])).toBe("devis");
  });

  test("signé, acompte attendu : les règlements", () => {
    expect(defaultSection([quote({ status: "accepte", deposit_status: "en_attente" })])).toBe("devis");
  });

  test("signé, solde attendu : les règlements", () => {
    const q = quote({ status: "accepte", deposit_status: "recu", balance_status: "en_attente" });
    expect(defaultSection([q])).toBe("devis");
  });

  test("signé, rien d'attendu : l'après-signature", () => {
    expect(defaultSection([quote({ status: "accepte" })])).toBe("apres");
    const solde = quote({ status: "realise", deposit_status: "recu", balance_status: "recu" });
    expect(defaultSection([solde])).toBe("apres");
  });

  test("le règlement se lit sur la pièce porteuse, pas sur la première venue", () => {
    // Un vieux devis resté « en attente » ne l'emporte pas sur la facture soldée.
    const devis = quote({ status: "envoye", deposit_status: "en_attente", issued_at: "2026-06-01" });
    const facture = quote({ status: "realise", deposit_status: "recu", balance_status: "recu" });
    expect(defaultSection([devis, facture])).toBe("apres");
  });
});

describe("jalonProgress", () => {
  test("une affaire vierge n'a rien franchi", () => {
    const { done, total } = jalonProgress("travaux", "etude_structurelle", EMPTY_JALONS);
    expect(done).toBe(0);
    expect(total).toBe(jalonOrder("travaux").filter((j) => !j.optional).length);
  });

  test("les étapes facultatives ne comptent pas", () => {
    const optional = jalonOrder("etudes", "etude_structurelle").filter((j) => j.optional);
    expect(optional.length).toBeGreaterThan(0);
    const jalons = { ...EMPTY_JALONS, [optional[0].key]: "2026-09-10" };
    expect(jalonProgress("etudes", "etude_structurelle", jalons).done).toBe(0);
  });

  test("un jalon daté compte", () => {
    const jalons = { ...EMPTY_JALONS, rib_sent_at: "2026-09-10" };
    expect(jalonProgress("travaux", "etude_structurelle", jalons).done).toBe(1);
  });
});
