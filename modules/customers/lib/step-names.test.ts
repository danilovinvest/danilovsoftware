import { describe, expect, test } from "bun:test";
import { CYCLE_LABEL, stepWrite, type CycleStep } from "./cycle";
import { jalonOrder, type Jalon } from "./jalons";
import type { ProjectMission } from "./types";

/*
  Un jalon, un nom : le cran de la frise et la ligne de l'après-signature qui
  écrivent la même colonne s'appellent pareil. « Envoi » et « Rapport »
  désignaient chacun deux crans différents, et le panneau d'un cran ne portait
  pas le nom de la ligne qui éditait le même fait.
*/

/** La colonne que le cran écrit, telle que l'après-signature la nomme. */
function columnOf(step: CycleStep): Jalon["key"] | null {
  const write = stepWrite(step);
  switch (write.target) {
    case "jalon":
    case "materials":
      return write.field;
    case "worksite_date":
      return "worksite_date";
    case "quote":
      return write.field === "deposit" ? "deposit_paid_at" : null;
    case "mark":
      return null;
  }
}

const PARCOURS: Array<["etudes" | "travaux", ProjectMission | undefined]> = [
  ["travaux", undefined],
  ["etudes", "etude_structurelle"],
  ["etudes", "rapport_attestation"],
  ["etudes", "sondage"],
];

const STEPS = Object.keys(CYCLE_LABEL) as CycleStep[];

describe("le nom d'un jalon", () => {
  test.each(PARCOURS)("est le même dans la frise et l'après-signature (%s, %s)", (metier, mission) => {
    for (const jalon of jalonOrder(metier, mission)) {
      const step = STEPS.find((candidate) => columnOf(candidate) === jalon.key);
      if (step) expect(CYCLE_LABEL[step].label).toBe(jalon.label);
    }
  });

  test("n'est porté que par un cran", () => {
    const labels = STEPS.map((step) => CYCLE_LABEL[step].label);
    expect(new Set(labels).size).toBe(labels.length);
    const shorts = STEPS.map((step) => CYCLE_LABEL[step].short);
    expect(new Set(shorts).size).toBe(shorts.length);
  });
});
