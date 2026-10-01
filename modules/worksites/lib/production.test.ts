import { describe, expect, test } from "bun:test";
import { actorOf, productionOf, stepLabel, type ProductionMilestones } from "./production";

const none: ProductionMilestones = {
  calc_done_at: null,
  plans_review_at: null,
  corrections_at: null,
  final_ready_at: null,
  plans_sent_at: null,
  report_written_at: null,
  report_validated_at: null,
  report_sent_at: null,
  survey_done_at: null,
  survey_report_sent_at: null,
};
const day = "2026-09-20";

describe("productionOf", () => {
  test("a structural study walks calcul → plans → contrôle → à envoyer", () => {
    expect(productionOf(none, "etude_structurelle")).toBe("calcul");
    expect(productionOf({ ...none, calc_done_at: day }, "etude_structurelle")).toBe("plans");
    expect(productionOf({ ...none, calc_done_at: day, plans_review_at: day }, "etude_structurelle")).toBe(
      "controle",
    );
    expect(productionOf({ ...none, corrections_at: day }, "etude_structurelle")).toBe("controle");
    expect(productionOf({ ...none, final_ready_at: day }, "etude_structurelle")).toBe("a_envoyer");
    expect(productionOf({ ...none, plans_sent_at: day }, "etude_structurelle")).toBeNull();
  });

  test("a later step proves the earlier ones, ticked or not", () => {
    expect(productionOf({ ...none, final_ready_at: day }, "etude_structurelle")).toBe("a_envoyer");
  });

  test("a report is written, validated, sent", () => {
    expect(productionOf(none, "rapport_attestation")).toBe("calcul");
    expect(productionOf({ ...none, report_written_at: day }, "rapport_attestation")).toBe("controle");
    expect(productionOf({ ...none, report_validated_at: day }, "rapport_attestation")).toBe("a_envoyer");
    expect(productionOf({ ...none, report_sent_at: day }, "rapport_attestation")).toBeNull();
  });

  test("a survey is done, then its report is sent", () => {
    expect(productionOf(none, "sondage")).toBe("calcul");
    expect(productionOf({ ...none, survey_done_at: day }, "sondage")).toBe("plans");
    expect(productionOf({ ...none, survey_report_sent_at: day }, "sondage")).toBeNull();
  });

  test("another mission's milestones do not move a study", () => {
    expect(productionOf({ ...none, report_sent_at: day }, "etude_structurelle")).toBe("calcul");
  });
});

describe("actorOf", () => {
  test("the engineer computes and checks, the drafter draws, the manager sends", () => {
    expect(actorOf("calcul", "etude_structurelle")).toBe("engineer");
    expect(actorOf("plans", "etude_structurelle")).toBe("drafter");
    expect(actorOf("controle", "etude_structurelle")).toBe("engineer");
    expect(actorOf("a_envoyer", "etude_structurelle")).toBe("manager");
  });

  test("a survey report is written by the engineer, not drawn", () => {
    expect(actorOf("plans", "sondage")).toBe("engineer");
  });
});

test("each step speaks the mission's words", () => {
  expect(stepLabel("calcul", "rapport_attestation")).toBe("Rapport à rédiger");
  expect(stepLabel("plans", "etude_structurelle")).toBe("Plans à dessiner");
});
