import { describe, expect, test } from "bun:test";
import { categoryOfNode } from "./categories";
import { groupSharedContacts } from "./hubs";
import { buildModel, familyOf, ficheSize } from "./model";
import { neighbourGroups } from "./neighbours";
import { clique, contact, fiche, link, payload } from "./test-fixtures";

describe("categoryOfNode", () => {
  test("l'apporteur prime sur le type", () => {
    expect(categoryOfNode(fiche("a", { kind: "syndic", is_referrer: true }))).toBe("apporteur");
  });
  test("syndic et copropriété avant la relation", () => {
    expect(categoryOfNode(fiche("a", { kind: "syndic", relation_effective: "prescripteur" }))).toBe("syndic");
    expect(categoryOfNode(fiche("a", { kind: "copropriete" }))).toBe("copropriete");
  });
  test("un gestionnaire se range avec les syndics, un organisme à part", () => {
    expect(categoryOfNode(fiche("a", { kind: "gestionnaire", relation_effective: "prescripteur" }))).toBe(
      "syndic",
    );
    expect(categoryOfNode(fiche("a", { kind: "organisme", relation_effective: "intervenant" }))).toBe(
      "organisme",
    );
    // Une relation choisie « intervenant » range aussi une société en organisme.
    expect(categoryOfNode(fiche("a", { kind: "societe", relation_effective: "intervenant" }))).toBe(
      "organisme",
    );
  });
  test("la relation effective range le reste", () => {
    expect(categoryOfNode(fiche("a", { relation_effective: "partenaire_technique" }))).toBe("prescripteur");
    expect(categoryOfNode(fiche("a", { relation_effective: "fournisseur" }))).toBe("fournisseur");
    expect(categoryOfNode(fiche("a", { relation_effective: "sous_traitant" }))).toBe("sous_traitant");
  });
  test("un client final se coupe en client et prospect", () => {
    expect(categoryOfNode(fiche("a", { is_client: true }))).toBe("client");
    expect(categoryOfNode(fiche("a"))).toBe("prospect");
  });
});

describe("groupSharedContacts", () => {
  test("une clique de quatorze fiches devient une étoile de quatorze rayons", () => {
    const ids = Array.from({ length: 14 }, (_, i) => `f${String(i).padStart(2, "0")}`);
    const edges = clique(ids, "0611223344", "Christian Dalmasso");
    expect(edges).toHaveLength(91);
    const { hubs, pairEdges } = groupSharedContacts(edges);
    expect(hubs).toHaveLength(1);
    expect(hubs[0].fiches).toHaveLength(14);
    expect(hubs[0].label).toBe("Christian Dalmasso");
    expect(pairEdges).toHaveLength(0);
  });

  test("l'adresse et le numéro d'une même personne ne font qu'une étoile", () => {
    const ids = ["a", "b", "c"];
    const edges = clique(ids, "x", "").map((edge) => ({ ...edge, via: ["jean@cab.fr", "0600000000"], label: "Jean · Jean" }));
    const { hubs } = groupSharedContacts(edges);
    expect(hubs).toHaveLength(1);
    expect(hubs[0].identifiers).toEqual(["0600000000", "jean@cab.fr"]);
    expect(hubs[0].label).toBe("Jean");
  });

  test("deux fiches seulement : un trait, pas d'étoile", () => {
    const { hubs, pairEdges } = groupSharedContacts([contact("a", "b", ["x@y.fr"], "Paul")]);
    expect(hubs).toHaveLength(0);
    expect(pairEdges).toHaveLength(1);
  });

  test("une seconde personne commune à une paire garde son trait", () => {
    const edges = clique(["a", "b", "c"], "hub@x.fr", "Hub");
    edges[0] = { ...edges[0], via: ["hub@x.fr", "pair@x.fr"], label: "Hub · Pair" };
    const { hubs, pairEdges } = groupSharedContacts(edges);
    expect(hubs).toHaveLength(1);
    expect(pairEdges.map((edge) => edge.id)).toEqual([edges[0].id]);
  });

  test("sans nom connu, l'étoile prend l'identifiant", () => {
    const { hubs } = groupSharedContacts(clique(["a", "b", "c"], "0612345678", "0612345678"));
    expect(hubs[0].label).toBe("0612345678");
  });
});

describe("buildModel", () => {
  const nodes = ["a", "b", "c", "d"].map((id) => fiche(id, { degree: 3 }));
  const graph = payload(nodes, [...clique(["a", "b", "c"], "x@cab.fr", "Marie"), link("d", "a")]);
  const model = buildModel(graph);

  test("les fiches, puis les interlocuteurs", () => {
    expect(model.nodes.map((node) => node.id)).toEqual(["a", "b", "c", "d", "hub:x@cab.fr"]);
    expect(model.byId.get("hub:x@cab.fr")?.category).toBe("interlocuteur");
  });

  test("la clique est remplacée par les rayons", () => {
    expect(model.edges.filter((edge) => edge.kind === "shared_contact")).toHaveLength(0);
    expect(model.edges.filter((edge) => edge.kind === "contact_hub")).toHaveLength(3);
  });

  test("un lien posé a un sens et se dessine en flèche", () => {
    const syndic = model.edges.find((edge) => edge.kind === "link:syndic");
    expect(syndic?.directed).toBe(true);
    expect(syndic?.family).toBe("link");
  });

  test("un lien vers une fiche inconnue est écarté", () => {
    const orphan = buildModel(payload([fiche("a")], [link("a", "z")]));
    expect(orphan.edges).toHaveLength(0);
  });

  test("la taille croît en racine carrée et reste bornée", () => {
    expect(ficheSize(0)).toBeLessThan(ficheSize(1));
    expect(ficheSize(100) - ficheSize(25)).toBeLessThan(ficheSize(25) - ficheSize(0));
    expect(ficheSize(10_000)).toBe(24);
  });

  test("familyOf range les liens posés ensemble", () => {
    expect(familyOf("link:payeur")).toBe("link");
    expect(familyOf("shared_domain")).toBe("shared_domain");
    expect(familyOf("pays_for")).toBe("pays_for");
  });
});

describe("neighbourGroups", () => {
  const model = buildModel(
    payload(
      ["copro", "syndic", "archi", "x", "y"].map((id) => fiche(id)),
      [link("copro", "syndic"), link("archi", "copro", "referred_project", 2), ...clique(["copro", "x", "y"], "m@x.fr", "Marc")],
    ),
  );

  test("chaque lien se dit dans son sens", () => {
    const titles = neighbourGroups(model, "copro").map((group) => group.title);
    expect(titles).toEqual(["A pour syndic", "Affaires apportées par", "Interlocuteurs communs"]);
    expect(neighbourGroups(model, "syndic")[0].title).toBe("Gère");
  });

  test("les affaires apportées disent combien", () => {
    const group = neighbourGroups(model, "archi")[0];
    expect(group.items[0].detail).toBe("2 affaires");
  });

  test("un payeur dit pour qui il paie, et combien d'affaires", () => {
    const paid = buildModel(payload([fiche("agefim"), fiche("marot")], [link("agefim", "marot", "pays_for", 3)]));
    const payer = neighbourGroups(paid, "agefim")[0];
    expect(payer.title).toBe("Paie les affaires de");
    expect(payer.items[0].detail).toBe("3 affaires");
    expect(neighbourGroups(paid, "marot")[0].title).toBe("Affaires payées par");
  });

  test("un interlocuteur liste ses fiches", () => {
    const group = neighbourGroups(model, "hub:m@x.fr")[0];
    expect(group.title).toBe("Présent sur les fiches");
    expect(group.items.map((item) => item.node.id)).toEqual(["copro", "x", "y"]);
  });
});
