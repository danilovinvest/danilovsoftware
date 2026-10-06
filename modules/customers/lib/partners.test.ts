import { describe, expect, test } from "bun:test";
import { hasPartnerSpace, partnerSummary, type ProjectPartner } from "./partners";

const partner = (over: Partial<ProjectPartner>): ProjectPartner => ({
  partner_id: "a",
  partner_name: "INGENICE",
  partner_kind: "ingenieur",
  role: "prescripteur",
  direct_fee: null,
  note: "",
  ...over,
});

describe("hasPartnerSpace", () => {
  test("prescribers, technical partners, referrers and role holders have one", () => {
    expect(hasPartnerSpace({ relation: "prescripteur", is_referrer: false })).toBe(true);
    expect(hasPartnerSpace({ relation: "partenaire_technique", is_referrer: false })).toBe(true);
    expect(hasPartnerSpace({ relation: "client_final", is_referrer: true })).toBe(true);
    expect(hasPartnerSpace({ relation: "client_final", is_referrer: false, is_partner: true })).toBe(true);
  });

  test("an ordinary client or a supplier does not", () => {
    expect(hasPartnerSpace({ relation: "client_final", is_referrer: false })).toBe(false);
    expect(hasPartnerSpace({ relation: "fournisseur", is_referrer: false, is_partner: false })).toBe(false);
  });
});

describe("partnerSummary", () => {
  const euros = (value: string) => `${value} €`;

  test("groups the roles of one fiche and says what was paid directly", () => {
    expect(
      partnerSummary(
        [
          partner({ direct_fee: "1800.00" }),
          partner({ role: "intervenant" }),
          partner({ partner_id: "b", partner_name: "Maison Balagane", role: "recommande" }),
        ],
        euros,
      ),
    ).toBe("INGENICE (prescrite, 1800.00 € réglés en direct · projet commun) · Maison Balagane (recommandé)");
  });

  test("nothing to say without partners", () => {
    expect(partnerSummary([], euros)).toBe("");
  });
});
