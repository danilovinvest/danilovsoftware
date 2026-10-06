import { describe, expect, test } from "bun:test";
import { teamLoad } from "./team";
import { readFixture } from "./test-fixtures";
import type { ReadWorksite } from "./types";

function study(
  id: string,
  production: ReadWorksite["production"],
  people: { engineer?: string; drafter?: string; manager?: string } = {},
  extra: { late?: boolean; outcome?: string; mission?: ReadWorksite["mission"] } = {},
): ReadWorksite {
  const base = readFixture({
    id,
    label: id,
    customer_name: `Client ${id}`,
    outcome: extra.outcome ?? "",
    engineer_id: people.engineer ?? null,
    drafter_id: people.drafter ?? null,
    manager_id: people.manager ?? null,
  });
  return {
    ...base,
    production,
    mission: extra.mission ?? "etude_structurelle",
    deadline: extra.late ? { label: "Promis au client il y a 2 j", tone: "danger", late: true } : null,
  };
}

const names = new Map([
  ["ing", "Paul Ingé"],
  ["des", "Lina Dessin"],
  ["resp", "Marc Resp"],
]);

describe("teamLoad", () => {
  test("a study sits once, with the person its next step waits for", () => {
    const team = teamLoad(
      [
        study("a", "calcul", { engineer: "ing", drafter: "des", manager: "resp" }),
        study("b", "plans", { engineer: "ing", drafter: "des", manager: "resp" }),
        study("c", "a_envoyer", { engineer: "ing", drafter: "des", manager: "resp" }),
        study("d", "controle", { engineer: "ing" }),
      ],
      names,
    );
    const by = Object.fromEntries(team.map((m) => [m.name, m.items.map((i) => i.read.worksite.id)]));
    expect(by).toEqual({ "Paul Ingé": ["a", "d"], "Lina Dessin": ["b"], "Marc Resp": ["c"] });
    expect(team[0].name).toBe("Paul Ingé");
  });

  test("a study whose expected role is not set goes to « Sans intervenant », first", () => {
    const team = teamLoad([study("a", "plans", { engineer: "ing" }), study("b", "calcul", { engineer: "ing" })], names);
    expect(team[0].id).toBeNull();
    expect(team[0].items.map((i) => [i.read.worksite.id, i.role])).toEqual([["a", "drafter"]]);
  });

  test("a survey report waits for the engineer, not a drafter", () => {
    const team = teamLoad([study("s", "plans", { engineer: "ing" }, { mission: "sondage" })], names);
    expect(team.map((m) => m.name)).toEqual(["Paul Ingé"]);
  });

  test("delivered, stopped or paused studies weigh on nobody", () => {
    expect(teamLoad([study("a", null, { engineer: "ing" }), study("b", "calcul", { engineer: "ing" }, { outcome: "arrete" })], names)).toEqual([]);
  });

  test("late studies come first and are counted", () => {
    const team = teamLoad(
      [study("a", "calcul", { engineer: "ing" }), study("b", "calcul", { engineer: "ing" }, { late: true })],
      names,
    );
    expect(team[0].late).toBe(1);
    expect(team[0].items[0].read.worksite.id).toBe("b");
  });

  test("a person missing from the directory keeps the study", () => {
    expect(teamLoad([study("a", "calcul", { engineer: "gone" })], names)[0].name).toBe("Compte inconnu");
  });
});
