import { describe, expect, test } from "bun:test";
import { countByCategory, DEFAULT_FILTERS, visibleSubgraph, type GraphFilters } from "./filters";
import { buildModel } from "./model";
import { edgeDisplay, nodeDisplay, type ViewState } from "./reducers";
import { graphStats, searchNodes } from "./stats";
import { createCanvasGraph, syncGraph, type Point } from "./sync";
import { clique, fiche, link, payload } from "./test-fixtures";
import type { CanvasPalette, Rgb } from "./theme-colors";

const base = payload(
  [
    fiche("a", { name: "Syndic Azur", kind: "syndic", degree: 4, issuer: "ompt-groupe" }),
    fiche("b", { name: "Copro Les Pins", kind: "copropriete", degree: 1, issuer: "ompt-structure" }),
    fiche("c", { name: "Dalmasso", degree: 2 }),
    fiche("d", { name: "Isolée" }),
    fiche("e", { name: "Archivée", archived: true, degree: 1 }),
    fiche("f", { name: "Fiche F", degree: 2 }),
  ],
  [link("b", "a"), link("e", "a"), ...clique(["a", "c", "f"], "m@x.fr", "Marc")],
);
const model = buildModel(base);
const ids = (filters: GraphFilters) => visibleSubgraph(model, filters).nodes.map((node) => node.id);

describe("visibleSubgraph", () => {
  test("par défaut : ni isolées ni archivées, et l'isolée est comptée", () => {
    const visible = visibleSubgraph(model, DEFAULT_FILTERS);
    expect(visible.nodes.map((node) => node.id)).toEqual(["a", "b", "c", "f", "hub:m@x.fr"]);
    expect(visible.isolatedCount).toBe(1);
  });

  test("les fiches sans lien se demandent", () => {
    expect(ids({ ...DEFAULT_FILTERS, showIsolated: true })).toContain("d");
  });

  test("les archivées se demandent aussi, avec leurs liens", () => {
    const visible = visibleSubgraph(model, { ...DEFAULT_FILTERS, hideArchived: false });
    expect(visible.nodes.map((node) => node.id)).toContain("e");
    expect(visible.edges.some((edge) => edge.source === "e")).toBe(true);
  });

  test("une étoile qui ne relie plus qu'une fiche disparaît", () => {
    const filters = { ...DEFAULT_FILTERS, categories: { ...DEFAULT_FILTERS.categories, prospect: false } };
    expect(ids(filters)).toEqual(["a", "b"]);
  });

  test("masquer une famille retire ses traits, et les fiches qu'elle seule reliait", () => {
    const filters = { ...DEFAULT_FILTERS, families: { ...DEFAULT_FILTERS.families, shared_contact: false } };
    expect(ids(filters)).toEqual(["a", "b"]);
  });

  test("le nœud regardé reste affiché, isolé ou archivé", () => {
    expect(visibleSubgraph(model, DEFAULT_FILTERS, "d").nodes.map((node) => node.id)).toContain("d");
    const archived = visibleSubgraph(model, DEFAULT_FILTERS, "e");
    expect(archived.nodes.map((node) => node.id)).toContain("e");
    expect(archived.edges.some((edge) => edge.source === "e")).toBe(true);
  });

  test("la société garde les fiches sans pièce", () => {
    expect(ids({ ...DEFAULT_FILTERS, company: "ompt-structure" })).toEqual(["c", "f", "hub:m@x.fr"]);
  });

  test("les comptes par catégorie suivent archive et société", () => {
    const counts = countByCategory(model, DEFAULT_FILTERS);
    expect(counts.prospect).toBe(3);
    expect(counts.syndic).toBe(1);
    expect(counts.interlocuteur).toBe(1);
  });
});

describe("graphStats et searchNodes", () => {
  const visible = visibleSubgraph(model, { ...DEFAULT_FILTERS, showIsolated: true });

  test("fiches, liens, composantes, top", () => {
    const stats = graphStats(visible);
    expect(stats.fiches).toBe(5);
    expect(stats.interlocuteurs).toBe(1);
    expect(stats.edges).toBe(4);
    expect(stats.components).toBe(1);
    expect(stats.largest).toBe(5);
    expect(stats.top.map((node) => node.id)).toEqual(["a", "c", "f", "b"]);
  });

  test("la recherche ignore accents et casse, et classe le début d'abord", () => {
    expect(searchNodes(model.nodes, "isolee")[0].id).toBe("d");
    expect(searchNodes(model.nodes, "pins")[0].id).toBe("b");
    expect(searchNodes(model.nodes, "dlmso")[0].id).toBe("c");
    expect(searchNodes(model.nodes, "m")).toEqual([]);
  });

  test("un interlocuteur se trouve par son adresse", () => {
    expect(searchNodes(model.nodes, "m@x.fr")[0].id).toBe("hub:m@x.fr");
  });
});

describe("syncGraph", () => {
  test("une relecture garde les positions, place le neuf près de ses voisins", () => {
    const graph = createCanvasGraph();
    const memory = new Map<string, Point>();
    syncGraph(graph, visibleSubgraph(model, DEFAULT_FILTERS), memory);
    graph.setNodeAttribute("a", "x", 500);
    graph.setNodeAttribute("a", "y", 500);

    const grown = buildModel(payload([...base.nodes, fiche("g", { name: "Neuve" })], [...base.edges, link("g", "a")]));
    const { added, removed } = syncGraph(graph, visibleSubgraph(grown, DEFAULT_FILTERS), memory);
    expect(added).toEqual(["g"]);
    expect(removed).toBe(0);
    expect(graph.getNodeAttribute("a", "x")).toBe(500);
    const g = graph.getNodeAttributes("g");
    expect(Math.hypot(g.x - 500, g.y - 500)).toBeLessThan(100);
    expect(graph.getEdgeAttribute("link:syndic:g>a", "type")).toBe("arrow");
  });

  test("un nœud masqué puis rendu reprend sa place", () => {
    const graph = createCanvasGraph();
    const memory = new Map<string, Point>();
    syncGraph(graph, visibleSubgraph(model, DEFAULT_FILTERS), memory);
    const before = graph.getNodeAttributes("b");
    const hidden = { ...DEFAULT_FILTERS, categories: { ...DEFAULT_FILTERS.categories, copropriete: false } };
    expect(syncGraph(graph, visibleSubgraph(model, hidden), memory).removed).toBe(1);
    syncGraph(graph, visibleSubgraph(model, DEFAULT_FILTERS), memory);
    expect(graph.getNodeAttributes("b").x).toBe(before.x);
    expect(graph.getNodeAttributes("b").y).toBe(before.y);
  });
});

describe("reducers", () => {
  const gray: Rgb = [100, 100, 100];
  const palette: CanvasPalette = {
    categories: {
      apporteur: [255, 0, 0],
      syndic: [0, 0, 255],
      copropriete: gray,
      prescripteur: gray,
      fournisseur: gray,
      sous_traitant: gray,
      client: gray,
      prospect: gray,
      interlocuteur: [0, 255, 0],
    },
    foreground: [0, 0, 0],
    muted: gray,
    border: [200, 200, 200],
    background: [255, 255, 255],
    brand: gray,
    font: "sans-serif",
  };
  const view = (over: Partial<ViewState> = {}): ViewState => ({
    palette,
    selected: null,
    selection: null,
    hovered: null,
    hover: null,
    pulse: new Set(),
    ...over,
  });
  const attrs = { x: 0, y: 0, size: 6, label: "A", category: "syndic" as const, archived: false, hub: false };
  const edge = { size: 1, type: "arrow" as const, family: "link" as const, inferred: false, weight: 1 };

  test("la couleur vient de la catégorie", () => {
    expect(nodeDisplay("a", attrs, view()).color).toBe("rgba(0,0,255,1)");
  });

  test("hors de la sélection : estompé, sans étiquette", () => {
    const out = nodeDisplay("z", attrs, view({ selected: "a", selection: new Set(["a", "b"]) }));
    expect(out.label).toBeNull();
    expect(out.color).not.toBe("rgba(0,0,255,1)");
  });

  test("le nœud choisi grossit et garde son nom", () => {
    const out = nodeDisplay("a", attrs, view({ selected: "a", selection: new Set(["a"]) }));
    expect(out.forceLabel).toBe(true);
    expect(out.size).toBeGreaterThan(6);
  });

  test("seuls les traits du nœud choisi restent", () => {
    const v = view({ selected: "a", selection: new Set(["a", "b"]) });
    expect(edgeDisplay(edge, ["a", "b"], v).hidden).toBeUndefined();
    expect(edgeDisplay(edge, ["b", "c"], v).hidden).toBe(true);
  });

  test("un nœud neuf est mis en avant", () => {
    expect(nodeDisplay("a", attrs, view({ pulse: new Set(["a"]) })).highlighted).toBe(true);
  });
});
